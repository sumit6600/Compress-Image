
const multer = require('multer');
const aws = require('aws-sdk');
const aws_key = require('../config/aws')

const s3 = new aws.S3({
  accessKeyId:aws_key.ID,
  secretAccessKey: aws_key.SECRET,
  region: aws_key.REGION
});

const storage = multer.memoryStorage();  
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },  
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // MIME type for .xlsx
      'application/vnd.ms-excel'  // MIME type for .xls
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);  
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, XLS, and XLSX files are allowed.'), false);
    }
  }
});
const uploadSingleMiddleware = upload.single('file'); 

const uploadFile = async (file, directory) => 
  {
      const separater = '||';
      let file_extension = file.originalname.split('.').pop();
      let file_name = `${file.originalname.split('.')[0]}${separater}${Date.now()}_${Math.random()}.${file_extension}`;
      let originalname = file.originalname;
      var s3_upload_dir = directory + `/${file_name}`;
      var params = {
          Key: s3_upload_dir,
          Bucket: aws_key.BUCKET_NAME,
          Body: file.buffer,
          ContentType: 'image/type'
      };
      let res = await new Promise((resolve, reject) =>{
          s3.upload(params, function (err, data) {
              console.log('file data', data);
              if (err) {
                  console.log("errdsadsadsadsa: ", err);
                  reject(false)
              } else {
                  let finalResponse = { file_name: file_name, url: data.Location,originalname:originalname, fileDirectory: s3_upload_dir };
                  resolve(finalResponse);
              }
          });
      });
      return res;
  }


const generatePresignedUrl = (bucketName, key) => {
    const params = {
        Bucket: bucketName,
        Key: key,
        Expires: 60 * 60 *60 // 1-hour expiration
    };

    return s3.getSignedUrl('getObject', params);
};
module.exports = {
  uploadSingleMiddleware,uploadFile , generatePresignedUrl
};
