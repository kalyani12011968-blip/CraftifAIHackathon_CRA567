// ============================================================
// JAL-RAKSHAK
// Neon Serverless PostgreSQL Database Configuration
// ============================================================

const { neon } = require("@neondatabase/serverless");
require("dotenv").config();


// ============================================================
// CHECK DATABASE URL
// ============================================================

let sql = null;

if (process.env.DATABASE_URL) {
    try {
        sql = neon(process.env.DATABASE_URL);
    } catch (err) {
        console.warn("Neon initialization warning:", err.message);
    }
} else {
    console.log("Neon DATABASE_URL not configured. Operating in local storage / mock mode.");
}


// ============================================================
// TEST DATABASE CONNECTION
// ============================================================

async function testDatabaseConnection() {
    if (!sql) {
        return false;
    }

    try {

        const result = await sql`
            SELECT NOW() AS current_time
        `;

        console.log("");
        console.log("==========================================");
        console.log("       NEON POSTGRESQL DATABASE");
        console.log("==========================================");
        console.log("Status: CONNECTED");
        console.log(
            "Database time:",
            result[0].current_time
        );
        console.log("==========================================");
        console.log("");

        return true;

    } catch (error) {

        console.error("");
        console.error("==========================================");
        console.error("       NEON DATABASE ERROR");
        console.error("==========================================");
        console.error("Status: CONNECTION FAILED");
        console.error(
            "Error:",
            error.message
        );
        console.error("==========================================");
        console.error("");

        return false;
    }
}


// ============================================================
// CHECK REQUIRED TABLES
// ============================================================

async function checkDatabaseTables() {
    if (!sql) return [];
    try {

        const tables = await sql`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `;

        console.log("");
        console.log("==========================================");
        console.log("       JAL-RAKSHAK DATABASE TABLES");
        console.log("==========================================");

        if (tables.length === 0) {

            console.log(
                "No tables found."
            );

        } else {

            tables.forEach((table, index) => {

                console.log(
                    `${index + 1}. ${table.table_name}`
                );

            });

        }

        console.log("==========================================");
        console.log("");

        return tables;

    } catch (error) {

        console.error(
            "Unable to check database tables:",
            error.message
        );

        return [];
    }
}


// ============================================================
// CHECK JAL-RAKSHAK REQUIRED TABLES
// ============================================================

async function verifyRequiredTables() {
    if (!sql) return false;
    const requiredTables = [
        "devices",
        "sensor_readings",
        "events",
        "alerts",
        "weather",
        "predictions",
        "vision_events"
    ];

    try {

        const result = await sql`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `;

        const existingTables = result.map(
            row => row.table_name
        );

        const missingTables =
            requiredTables.filter(
                table =>
                    !existingTables.includes(table)
            );

        console.log("");
        console.log("==========================================");
        console.log("       REQUIRED TABLE CHECK");
        console.log("==========================================");

        requiredTables.forEach(table => {

            if (existingTables.includes(table)) {

                console.log(
                    `✓ ${table}`
                );

            } else {

                console.log(
                    `✗ ${table} - MISSING`
                );

            }

        });

        console.log("");

        if (missingTables.length === 0) {

            console.log(
                "All required JAL-RAKSHAK tables exist."
            );

        } else {

            console.log(
                "Missing tables:",
                missingTables.join(", ")
            );

        }

        console.log("==========================================");
        console.log("");

        return missingTables.length === 0;

    } catch (error) {

        console.error(
            "Table verification failed:",
            error.message
        );

        return false;
    }
}


// ============================================================
// GENERIC QUERY FUNCTION
// ============================================================

async function queryDatabase(
    query,
    params = []
) {
    if (!sql) return null;
    try {

        const result = await sql.query(
            query,
            params
        );

        return result;

    } catch (error) {

        console.error(
            "Database query error:",
            error.message
        );

        throw error;
    }
}


// ============================================================
// HEALTH CHECK
// ============================================================

async function databaseHealthCheck() {
    if (!sql) {
        return {
            success: true,
            status: "local_storage",
            database: "local_json_fallback",
            timestamp: new Date().toISOString()
        };
    }
    try {

        const result = await sql`
            SELECT
                NOW() AS current_time,
                current_database() AS database_name,
                current_user AS database_user
        `;

        return {
            success: true,
            status: "healthy",
            database: result[0].database_name,
            user: result[0].database_user,
            timestamp: result[0].current_time
        };

    } catch (error) {

        return {
            success: false,
            status: "unhealthy",
            error: error.message
        };
    }
}


// ============================================================
// CLOSE / CONNECTION NOTE
// ============================================================
//
// Neon serverless SQL does not require us to manually create
// and close a traditional PostgreSQL connection pool here.
//
// The `sql` client handles the serverless connection behavior.
//
// ============================================================


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    sql,

    testDatabaseConnection,

    checkDatabaseTables,

    verifyRequiredTables,

    queryDatabase,

    databaseHealthCheck

};