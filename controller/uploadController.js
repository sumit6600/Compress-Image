const path = require('path');
const Excel = require('exceljs');
const { validateFile, processImages, imageCompress } = require('../service/FileProcess');
const db = require('../config/db')
const awc_const =  require('../config/aws')
const fileUpload = require('../middleware/fileUpload')
const utils =  require("../helper/utils")
const uuid = require('uuid');
const {promisify} =  require('util')
const AWS = require('aws-sdk');
const { generate_xls ,download_xls_file  ,download_error_txt} = require('../helper/ExcelHelper');
const s3 = new AWS.S3({
    accessKeyId: awc_const.ID,
    secretAccessKey: awc_const.SECRET
});
module.exports.uploadFile = async(req , res , next) =>{
    try {
        if (!req.file) {
            return next(new Error('No file upload'));
        }
          let file =  req.file;
          const directoryName = `ImageProcessorFiles`;
          const uploadResult = await fileUpload.uploadFile(file, directoryName);
          let fileName = uploadResult.file_name;
          const filePath = `${directoryName}/${fileName}`;
          const s3Params = {
              Bucket: awc_const.BUCKET_NAME,
              Key: filePath,
          };
          const stream = await s3.getObject(s3Params).createReadStream();
          stream.on('error', () => {
              return next(new Error('The specified file doesnt exists'));
          });
          const workbook = new Excel.Workbook();
          workbook.xlsx.read(stream).then(async (workbook) => {
            const headers = [];
            const columnData = [];
            const mainData = [];
          
            const worksheet = workbook.getWorksheet(1); 
            if (!worksheet) {
              const response = utils.formatedResponse({ message: 'No Worksheet found in the file' });
              return res.status(response.code).json(response);
            }
          
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
              const cellValues = row.values;
              cellValues.shift(); 
              if (rowNumber === 1) {
                headers.push(...cellValues);  
              } else {
                columnData.push(cellValues);
              }
            });
          
            for (let i = 0; i < columnData.length; i++) {
              const rowObject = {};
              for (let j = 0; j < headers.length; j++) {
                const headerKey = headers[j]?.replace(/\s/g, "_"); 
                rowObject[headerKey] = columnData[i][j]; 
              }
              mainData.push(rowObject);
            }
          
            if (mainData.length <= 0) {
                return next(new Error('File is empty'));
            }
          
            const requestId = uuid.v4().slice(0, 12); 
            const [result] = await db.query('INSERT INTO image_requests (request_id, status) VALUES (?, ?)', [requestId, 'pending']);
            for (const row of mainData) {
            let image_links;
            if(row?.Input_Image_Urls?.text){
                image_links =  row?.Input_Image_Urls?.text  && Object.keys(row?.Input_Image_Urls).length > 0 ? row?.Input_Image_Urls?.text.split(',') : [];
            }else{
                image_links =  row?.Input_Image_Urls  && Object.keys(row?.Input_Image_Urls).length > 0 ? row?.Input_Image_Urls?.split(',') : [];
            }
            for(const images of image_links){
                await db.query(
                    'INSERT INTO images (request_id, product_name, input_image_urls, status) VALUES (?, ?, ?, ?)',
                    [requestId, row['Product_Name'], images, 'pending']
                    ); 
            }}

            if(!result){
                throw new Error("Getting Error while uploading.")
            }
    
            processImages(mainData, requestId);
            res.json({ requestId, message: 'Images are being processed' });
          });
    } catch (error) {
        console.error('Error processing CSV:', error.message);
      const response =  utils.formatedResponse(error);
      return res.status(response.code).json(response);
    }
}

module.exports.checkStatus = async (req, res, next) => {
    const { requestId } = req.query;
    try {
        const [requestStatus] = await db.query('SELECT status FROM image_requests WHERE request_id = ?', [requestId]);
        if (!requestStatus) {
            return res.status(404).json({ error: 'Request ID not found' });
        }
        res.json({ requestId, status: requestStatus[0].status });
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
}

module.exports.outputFile = async(req , res , next) =>{
    const { requestId } = req.query;
    try {
      const [images] = await db.query('SELECT request_id,  product_name ,input_image_urls , output_image_urls, status  FROM images WHERE request_id = ?', [requestId]);
        console.log(images);
      const headers = {request_id : 'Request Id' , product_name :  'Product Name', input_image_urls : 'Input Image Urls', output_image_urls : 'Output Image Urls'}
        try {
        const excelBuffer = await promisify(generate_xls)(images, headers)
        return download_xls_file(res, excelBuffer);
    } catch (error) {
        console.log(error)
        return download_error_txt(res, error);
    }  
    } catch (error) {
      console.error('Error generating CSV:', error);
      res.status(500).json({ error: 'Failed to generate CSV' });
    }
}

  
module.exports.getRequestId = async (req, res, next) => {
    const { requestId } = req.query;
    try {
        const [requestStatus] = await db.query('SELECT * FROM image_requests');
        if (!requestStatus) {
            return res.status(404).json({ error: 'Request ID not found' });
        }
        res.json({list: requestStatus});
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
}