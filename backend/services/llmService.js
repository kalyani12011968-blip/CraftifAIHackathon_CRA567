const {
    analyzeWaterRisk
} = require("../../llm/analysisService");

const {
    askAssistant
} = require("../../llm/chatbotService");

async function analyze(data) {

    return await analyzeWaterRisk(data);
}

async function chat(
    question,
    data
) {

    return await askAssistant(
        question,
        data
    );
}

module.exports = {
    analyze,
    chat
};