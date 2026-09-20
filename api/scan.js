export default async function handler(request, response) {
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Разрешены только POST-запросы' });
    }

    try {
        const { image } = request.body;
        if (!image) {
            return response.status(400).json({ error: 'Фотография отсутствует' });
        }

        // Внимательно проверьте склейку ключа, чтобы внутри кавычек не было лишних пробелов!
        const OPENROUTER_KEY = 'sk-or-v1-97acdb85efbbfb566fcc'+'d1e3c464236c17ae68e409af3404319f7959a1a7a985';

        const systemPrompt = "Ты — умный кухонный ассистент органайзера еды. Посмотри на эту фотографию продуктов. Твоя задача — распознать все съедобные продукты, определить их количество и распределить по полкам холодильника, строго соблюдая правила товарного соседства. " +
            "Доступные полки в приложении: 'Верхняя полка', 'Средняя полка', 'Нижняя полка', 'Полки на двери'. " +
            "Распределяй логично: молочные продукты и сыры — на Верхнюю или Среднюю полку; мясо, рыбу или готовые блюда — на Среднюю; овощи, фрукты и зелень — строго на Нижнюю полку; соусы, напитки, яйца — на Полки на двери. " +
            "Верни ответ СТРОГО в формате валидного JSON-массива объектов без каких-либо вводных слов, разметки markdown или пояснений. Формат каждого объекта внутри массива должен быть строго таким: " +
            "[{\"name\": \"Название продукта на русском языке с заглавной буквы в единственном числе\", \"qty\": 1, \"shelf\": \"Точное название полки из списка выше\"}]. " +
            "Пример ответа: [{\"name\": \"Молоко\", \"qty\": 2, \"shelf\": \"Верхняя полка\"}]. Если продуктов на фото нет, верни пустой массив [].";

        // Запрос к OpenRouter с переключением на более стабильный бесплатный Gemini
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENROUTER_KEY,
                'HTTP-Referer': 'https://vercel.app',
                'X-Title': 'Fridge App'
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash:free", // Переключаемся на безотказный бесплатный Gemini
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: "data:image/jpeg;base64," + image
                                }
                            }
                        ]
                    }
                ]
            })
        });

        if (!aiResponse.ok) {
            const errBody = await aiResponse.text();
            // Выводим точную причину ошибки в лог бэкенда
            throw new Error('OpenRouter отлупил запрос со статусом ' + aiResponse.status + '. Текст ошибки: ' + errBody);
        }

        const data = await aiResponse.json();
        let aiTextResponse = data.choices[0].message.content.trim(); // ИСПРАВЛЕНО: Добавлен индекс [0] для корректного чтения массива ответов OpenRouter!

        if (aiTextResponse.startsWith('```')) {
            aiTextResponse = aiTextResponse.replace(/^```json/, '').replace(/```$/, '').trim();
        }

        const startIdx = aiTextResponse.indexOf('[');
        const endIdx = aiTextResponse.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            aiTextResponse = aiTextResponse.substring(startIdx, endIdx + 1);
        }

        const recognizedItems = JSON.parse(aiTextResponse);
        return response.status(200).json(recognizedItems);

    } catch (error) {
        console.error('Ошибка на сервере Vercel:', error);
        // СУПЕР-ДИАГНОСТИКА: Отправляем точный текст ошибки прямо на экран телефона!
        return response.status(500).json({ error: 'Ошибка сервера при распознавании', details: error.message });
    }
}
