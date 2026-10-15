const {
    predict
} = require("../services/aiService");

const {
    analyze: analyzeLLM,
    chat: chatLLM
} = require("../services/llmService");


// ======================================
// AI / ML PREDICTION
// ======================================

async function prediction(req, res) {

    try {

        const result =
            await predict(req.body);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Prediction error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


// ======================================
// LLM WATER ANALYSIS
// ======================================

async function analyze(req, res) {

    try {

        const result =
            await analyzeLLM(req.body);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "LLM analysis error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


// ======================================
// LLM CHATBOT
// ======================================

async function chat(req, res) {

    try {

        const {
            question,
            sensorData
        } = req.body;

        if (!question) {

            return res.status(400).json({
                success: false,
                message: "question is required"
            });
        }

        const result =
            await chatLLM(
                question,
                sensorData || {}
            );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Chatbot error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


// ======================================
// EXPORT
// ======================================

module.exports = {
    prediction,
    analyze,
    chat
};