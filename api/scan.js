export default async function handler(request, response) {
    // Разрешаем вашему мобильному приложению обращаться к этому бэкенду
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Обрабатываем предварительный запрос браузера (Preflight OPTIONS)
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Разрешены только POST-запросы' });
    }

    try {
        const { image } = request.body;
        if (!image) {
            return response.status(400).json({ error: 'Фотография продукта отсутствует в запросе' });
        }

        const systemPrompt = "Ты — умный кухонный ассистент органайзера еды. Посмотри на эту фотографию продуктов. Твоя задача — распознать все съедобные продукты, определить их количество и распределить по полкам холодильника, строго соблюдая правила товарного соседства. " +
            "Доступные полки в приложении: 'Верхняя полка', 'Средняя полка', 'Нижняя полка', 'Полки на двери'. " +
            "Распределяй логично: молочные продукты и сыры — на Верхнюю или Среднюю полку; мясо, рыбу или готовые блюда — на Среднюю; овощи, фрукты и зелень — строго на Нижнюю полку; соусы, напитки, яйца — на Полки на двери. " +
            "Верни ответ СТРОГО в формате валидного JSON-массива объектов без каких-либо вводных слов, разметки markdown или пояснений. Формат каждого объекта внутри массива должен быть строго таким: " +
            "[{\"name\": \"Название продукта на русском языке с заглавной буквы в единственном числе\", \"qty\": 1, \"shelf\": \"Точное название полки из списка выше\"}]. " +
            "Пример ответа: [{\"name\": \"Молоко\", \"qty\": 2, \"shelf\": \"Верхняя полка\"}]. Если продуктов на фото нет, верни пустой массив [].";

        // ОТПРАВЛЯЕМ СЕРВЕРНЫЙ ЗАПРОС К ИИ (БЕЗ БЛОКИРОВОК CORS)
        const aiResponse = await fetch('https://llm-gateway.ru', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llava",
                messages: [
                    {
                        role: "user",
                        content: systemPrompt,
                        images: [image] // Пересылаем чистый Base64
                    }
                ],
                stream: false
            })
        });

        if (!aiResponse.ok) {
            throw new Error('Внешний ИИ-шлюз вернул ошибку: ' + aiResponse.status);
        }

        const data = await aiResponse.json();
        let aiTextResponse = data.message.content.trim();

        // Очищаем от возможных markdown-тегов ```json
        if (aiTextResponse.startsWith('```')) {
            aiTextResponse = aiTextResponse.replace(/^```json/, '').replace(/```$/, '').trim();
        }

        // Вырезаем границы JSON-массива
        const startIdx = aiTextResponse.indexOf('[');
        const endIdx = aiTextResponse.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            aiTextResponse = aiTextResponse.substring(startIdx, endIdx + 1);
        }

        const recognizedItems = JSON.parse(aiTextResponse);
        
        // Возвращаем результат вашему приложению
        return response.status(200).json(recognizedItems);

    } catch (error) {
        console.error('Ошибка на сервере Vercel:', error);
        return response.status(500).json({ error: 'Ошибка сервера при распознавании', details: error.message });
    }
}
