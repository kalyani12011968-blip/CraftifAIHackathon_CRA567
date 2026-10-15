const {
    SYSTEM_PROMPT,
    buildChatPrompt
} = require("./promptTemplates");

async function askAssistant(
    question,
    sensorData = {}
) {

    const apiKey =
        process.env.OPENAI_API_KEY;

    // ==================================
    // FALLBACK CHAT
    // ==================================

    if (!apiKey) {

        return {
            success: true,
            response:
                fallbackChat(
                    question,
                    sensorData
                ),
            source: "fallback"
        };
    }

    try {

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${apiKey}`
                },

                body: JSON.stringify({
                    model:
                        process.env.OPENAI_MODEL ||
                        "gpt-5",

                    instructions:
                        SYSTEM_PROMPT,

                    input:
                        buildChatPrompt(
                            question,
                            sensorData
                        )
                })
            }
        );

        if (!response.ok) {

            throw new Error(
                "LLM request failed"
            );
        }

        const result =
            await response.json();

        return {
            success: true,

            response:
                result.output_text ||
                "No response generated.",

            source: "llm"
        };

    } catch (error) {

        console.error(
            "Chatbot error:",
            error.message
        );

        return {
            success: true,

            response:
                fallbackChat(
                    question,
                    sensorData
                ),

            source: "fallback"
        };
    }
}


// ======================================
// FALLBACK CHAT
// ======================================

function fallbackChat(
    question,
    data
) {

    const risk =
        Number(data.riskScore ?? 0);

    const trend =
        data.waterTrend ||
        "UNKNOWN";

    if (
        question
            .toLowerCase()
            .includes("risk")
    ) {

        return (
            `The current risk score is ` +
            `${risk}/100 and the water trend ` +
            `is ${trend}.`
        );
    }

    if (
        question
            .toLowerCase()
            .includes("flood")
    ) {

        if (
            data.event ===
            "FLOOD_ESCALATION"
        ) {

            return (
                "The system has detected " +
                "a flood-escalation pattern. " +
                "Verify the sensor reading and " +
                "follow the configured emergency response."
            );
        }

        return (
            "A flood escalation has not " +
            "been detected from the current data."
        );
    }

    return (
        "Current monitoring data shows " +
        `water level ${data.waterLevel ?? "N/A"} cm, ` +
        `risk ${risk}/100, and trend ${trend}.`
    );
}

module.exports = {
    askAssistant
};