import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SSPL-TaskFlow API',
            version: '1.0.0',
            description: 'API documentation for the SSPL-TaskFlow SaaS Platform',
            contact: {
                name: 'API Support',
                url: process.env.CLIENT_URL || 'http://localhost:5173',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:5000',
                description: 'API Server',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'], // Files containing annotations for the OpenAPI Specification
};

export const swaggerSpec = swaggerJsdoc(options);
