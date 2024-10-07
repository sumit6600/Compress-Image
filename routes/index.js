const routes =  require('express').Router();
const { uploadFile, getRequestId, checkStatus ,outputFile } = require('../controller/uploadController');
const FileProcessService = require('../service/FileProcess');
const { uploadSingleMiddleware } = require('../middleware/fileUpload');

routes.get("/sample-downlaod-sheet" , FileProcessService.fileDownload )
routes.post("/upload-file-compress" ,uploadSingleMiddleware , uploadFile )
routes.get('/file-upload-status' ,  checkStatus )
routes.get('/file-upload-output' ,  outputFile )
routes.get('/list-request' ,  getRequestId )
module.exports = routes;

