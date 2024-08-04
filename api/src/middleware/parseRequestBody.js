const parseRequestBody = async (request, context) => {
    try {
        
        context.log('Attempting to parse request body');

        const rawBody = await request.text();

        context.log('Raw request body:', rawBody);

        const parsedBody = JSON.parse(rawBody);

        context.log('Parsed request body:', JSON.stringify(parsedBody));

        return { success: true, body: parsedBody };

    } catch (error) {

        context.log.error('Error parsing JSON:', error);
        return { success: false, error: 'Invalid JSON in request body' };
    }
};

module.exports = { parseRequestBody };