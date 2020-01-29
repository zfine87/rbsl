/**
 * Config object for accessing cosmos DB
 */
export const config = {
    host: process.env.HOST || "https://rbsl-db.documents.azure.com:443/",
    authKey: process.env.AUTH_KEY || "aZTmuUnxGhz33VqsX4QLVCFTmVh9CNLC3szZ3zDiUh3V8fNgRUXLdM1JZSa8y4ZVAJyy9oPhm2VY6yFoTIgBcQ==",
    databaseId: "ToDoList",
    collectionId: "Items"
};