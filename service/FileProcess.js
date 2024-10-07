
const moment = ("moment")
const ExcelHelper = require('../helper/ExcelHelper');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const db  = require('../config/db')
const aws = require('aws-sdk');
const aws_key = require('../config/aws')
const fileUpload = require('../middleware/fileUpload')
const s3 = new aws.S3({
  accessKeyId:aws_key.ID,
  secretAccessKey: aws_key.SECRET,
  region: aws_key.REGION
});


class FileProcess {

    static async fileDownload(req, res, next) {
        try {
            let common_header = ["S.NO.", "Product Name", "Input Image Urls"]
            const sample_file_name = "UPLOAD_FILES";
            let excelFields = {};
            ExcelHelper.generate_xls_template(
                common_header,
                excelFields,
                sample_file_name,
                (err, result) => {
                    if (err) {
                        ExcelHelper.download_error_txt(res, err);
                    } else {
                        ExcelHelper.download_xls_file(
                            res,
                            result,
                            sample_file_name
                        );
                    }
                }
            );

        } catch (error) {
            console.log(error)
            next(error);
        }
    }

    /**
  * Validates a CSV file from a provided stream.
  * @param {stream.Readable} fileStream - The readable stream of the CSV file.
  * @returns {Promise<Array>} - A promise that resolves with the parsed CSV rows or rejects with an error.
  */
    static async validateFile(fileStream) {
        try {
            const rowData = [];
            return new Promise((resolve, reject) => {
                fileStream
                    .pipe(csv())
                    .on('data', (row) => {
                        // Validate CSV columns
                        if (!row['Serial Number'] || !row['Product Name'] || !row['Input Image Urls']) {
                            reject(new Error('Invalid CSV format: Missing required columns'));
                        } else {
                            rowData.push(row);
                        }
                    })
                    .on('end', () => resolve(rowData))
                    .on('error', (error) => reject(error));
            });
        } catch (error) {
            throw error;
        }
    }

    static async imageCompress(imagePath) {
        try {
            console.log("imagePath:>>>>>>>>>>>>>>>>>>>>>>>>>>>" ,imagePath)
            const response = await axios({ url: imagePath, responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);

            const originalSizeInBytes = imageBuffer.length;
            const originalSizeInKB = (originalSizeInBytes / 1024).toFixed(2); 
            console.log(`Original Image Size: ${originalSizeInKB} KB`);

            const compressedImageBuffer = await sharp(imageBuffer).jpeg({ quality: 50 }) .toBuffer();

            const compressedSizeInBytes = compressedImageBuffer.length;
            const compressedSizeInKB = (compressedSizeInBytes / 1024).toFixed(2); 
            console.log(`Compressed Image Size: ${compressedSizeInKB} KB`);

            const fileName = `compressed-image-${Date.now()}.jpg`;
            const uploadParams = {
                Bucket: aws_key.BUCKET_NAME, 
                Key: fileName,
                Body: compressedImageBuffer,
                ContentType: 'image/jpeg',
            };
    
            const uploadResult = await s3.upload(uploadParams).promise();
            const presignedUrl = fileUpload.generatePresignedUrl(uploadParams.Bucket, uploadResult.Key);
            console.log("presignedUrl" ,presignedUrl)
            return presignedUrl; 

        } catch (error) {
            console.log({error})
            throw error
        }
    }

    static async processImages(images, request_id) {
        try {
            console.log({images})
            let imageUrls;
            for (const image of images) {
                if(image?.Input_Image_Urls?.text){
                     imageUrls = image['Input_Image_Urls'] &&  Object.keys(image?.Input_Image_Urls).length > 0 ? image?.Input_Image_Urls?.text.split(',') : [];
                }else{
                     imageUrls = image['Input_Image_Urls'] &&  Object.keys(image?.Input_Image_Urls).length > 0 ? image?.Input_Image_Urls?.split(',') : [];
                }
                let outputUrls = [];
                console.log("imageUrls" ,imageUrls)
                for (const imageUrl of imageUrls) {
                    try {
                        console.log("imageUrl" ,imageUrl)
                        const processedImagePath = await FileProcess.imageCompress(imageUrl);
                        await db.query(
                            'UPDATE images SET output_image_urls = ?, status = ? WHERE request_id = ? AND product_name = ?',
                            [processedImagePath, 'complete', request_id, image['Product_Name']]
                          );
                    } catch (error) {
                        console.log(error)
                        await db.query('UPDATE images SET status = ? WHERE request_id = ? AND input_image_urls = ?', ['failed', request_id, imageUrl]);
                        continue;
                    }
                }
                console.log("outputUrls" ,outputUrls)

            }

              await db.query('UPDATE image_requests SET status = ? WHERE request_id = ?', ['complete', request_id]);        
              // FileProcess.triggerWebhook(request_id); Stopping this for now

        } catch (error) {
            throw error
        }
    }


    static async triggerWebhook(request_id) {
        try {
            await axios.post('https://compress-your-image.vercel.app/', {
                request_id: request_id,
                status: 'complete'
            });
        } catch (error) {
            console.error('Failed to trigger webhook:', error);
        }
    }
}

module.exports = FileProcess;
