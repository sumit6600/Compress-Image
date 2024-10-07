require('dotenv').config();
module.exports = {
    ID: process.env.ID,
    SECRET: process.env.SECRET,
    BUCKET_NAME: process.env.BUCKET_NAME,
    S3_URL: process.env.S3_URL,
    ORG_LOGO_BUCKET : process.env.ORG_LOGO_BUCKET,
    S3_URL_MASTER: process.env.S3_URL_MASTER,
    ORG_OPEN_DIRECTORY: process.env.ORG_OPEN_DIRECTORY,
    REGION  : process.env.REGION
}
    