/**
 * Formats a custom error to match the express-validator structure.
 * 
 * @param {string} msg - The error message
 * @param {string} path - The field name / path that caused the error
 * @param {string} [value=""] - The value of the field
 * @param {string} [location="body"] - The location of the param
 * @param {string} [type="field"] - The error type
 * @returns {object} - The formatted error object containing the errors array
 */
const formatError = (msg, path = "server", value = "", location = "body", type = "field") => {
    return {
        errors: [
            {
                type,
                value,
                msg,
                path,
                location
            }
        ]
    };
};

module.exports = {
    formatError
};