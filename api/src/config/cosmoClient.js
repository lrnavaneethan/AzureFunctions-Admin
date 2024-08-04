const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;

if (!endpoint || !key) {
    throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY must be set in the environment variables');
}

const client = new CosmosClient({ endpoint, key });

const databaseId = 'developerDatabase';
const containerId = 'developerDATAS';

const database = client.database(databaseId);
const container = database.container(containerId);

console.log('Cosmos DB client initialized successfully');

module.exports = { container };