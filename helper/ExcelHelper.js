let xls = require('excel4node');
let header_style = {
    font: { bold: true } ,
    alignment:{
        vertical: 'center',
        horizontal: 'center'
    }
};
let sheet_opt = { pageSetup: { fitToWidth: 1 } };
let hiden_sheet_opt = { hidden: false };

class ExcelHelper{
    static generate_xls_template() {
        var arg_len = arguments.length;
        var callback_fun = arguments[arg_len - 1];
        try {
            if (arg_len < 2) { throw new Error('Header data and callback Function required.'); }
            var header = arguments[0];
            var validation = arg_len >= 3 ? arguments[1] : {};
            var title = arg_len == 4 ? arguments[2] : 'Template';
            if (typeof header != 'object') { throw new Error('Invalid Header.'); }
            if (typeof callback_fun != 'function') { throw new Error('Callback function error.'); }
            if (typeof validation != 'object') { throw new Error('Invalid Validation.'); }
            if (typeof title != 'string') { throw new Error('Invalid Title.'); }
            var workbook = new xls.Workbook();
            var worksheet = workbook.addWorksheet(title, sheet_opt);
            var validationsheet = workbook.addWorksheet('Validations', hiden_sheet_opt);
            var formula_pos_range = {};
            var c = 1;
            for (const key in header) {
                if (validation.hasOwnProperty(key) && typeof validation[key] == 'object') {
                    var r = 1;
                    validationsheet.cell(r, c).string(header[key].toString()).style(header_style);
                    for (const k in validation[key]) {
                        r++;
                        if (validation[key][k] != '' && validation[key][k] != null) {
                            validationsheet.cell(r, c).string(validation[key][k].toString());
                        }
                    }
                    var col_char = xls.getExcelAlpha(c);
                    formula_pos_range[key] = '=Validations!$' + col_char + '$2:$' + col_char + '$' + (r < 2 ? 2 : r);
                    c++;
                }
            }
            c = 1;
            for (const key in header) {
                worksheet.cell(1, c).string(header[key].toString()).style(header_style);
                if (formula_pos_range.hasOwnProperty(key)) {
                    var col_char = xls.getExcelAlpha(c);
                    worksheet.addDataValidation({
                        type: 'list',
                        allowBlank: true,
                        prompt: 'Choose from dropdown',
                        error: 'Invalid choice was chosen',
                        showDropDown: true,
                        sqref: col_char + '2:' + col_char + '500',
                        formulas: [formula_pos_range[key]]
                    });
                }
                c++;
            }
            workbook.setSelectedTab(0);
            workbook.writeToBuffer().then(data => {
                callback_fun(false, data);
            }).catch(err => {
                callback_fun(err);
            });
        } catch (err) {
            if (typeof callback_fun != 'function') {
                console.log(err.message);
            } else {
                callback_fun(err);
            }
        }
    }
    static download_xls_file(res, xls_buff, filename) {
        try {
            if (typeof res != 'object') { throw new Error('Invalid Response Object.'); }
            if (!xls_buff) { throw new Error('Invalid Excel buffer.'); }
            var f_n = filename ? (filename + '.xlsx') : ('Excel' + Date.now() + '.xlsx');
            res.status(200);
            res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment(f_n);
            res.send(xls_buff);
        } catch (err) {
            console.log(err)
            this.download_error_txt(res, err);
        }
    }
    static download_error_txt(res, error) {
        var text = error ? error.message : 'Empty Error.';
        res.status(200);
        res.type('text/plain');
        res.attachment('error.txt');
        res.send(text);
    }
    static generate_xls() {
        var arg_len = arguments.length;
        var callback_fun = arguments[arg_len - 1];
        try {
            if (arg_len < 2) { throw new Error('Data and callback Function required.'); }
            var data = arguments[0];
            if (typeof data != 'object') { throw new Error('Invalid data.'); }
            var header = {};
            if (arg_len >= 3) {
                header = arguments[1];
            }
            if (!header || (typeof header == 'object' && Object.keys(header).length <= 0)) {
                header = {};
                for (const k in data[0]) {
                    header[k] = k;
                }
            }
            if (typeof header != 'object') { throw new Error('Invalid Header.'); }
            var title = arg_len >= 4 ? arguments[2] : null;
            let has_sno = arg_len == 5 ? arguments[3] : false;
            if (typeof has_sno != "boolean") { throw new Error('Serial no must have boolean value.'); }
            if (typeof callback_fun != 'function') { throw new Error('Callback function error.'); }
            var workbook = new xls.Workbook();
            var worksheet = workbook.addWorksheet('sheet1', sheet_opt);
            // hiding column by passing the number of column
            if(arguments[2]?.hidden_column){
                worksheet.column(arguments[2]?.hidden_column).hidden = true;
            }
            var r = 1;
            if (title) {
                if (typeof title == 'string') {
                    title = [title];
                }
                for (const k in title) {
                    worksheet.cell(r, 1, r, 10, true).string(title[k]).style({ font: { bold: true } });
                    r++;
                }
                r++;
            }
            var c = 1;
            if (has_sno) {
                worksheet.cell(r, c).string("S. No.").style(header_style);
                c++;
            }
            for (const k in header) {
                worksheet.cell(r, c).string(header[k]?.toString()).style(header_style);
                c++;
            }
            if (data.length > 0) {
                data.forEach((row, sno) => {
                    r++;
                    var c = 1;
                    if (has_sno) {
                        worksheet.cell(r, c).string((sno + 1).toString());
                        c++;
                    }

                    if(row.hasOwnProperty("Parameter"))
                    {
                        worksheet.cell(r, c).string((row['Parameter'] == null ? '' : row['Parameter']).toString() );
                        c++;
                        delete row['Parameter'];
                    }
                    for (const k in header) {
                        let type = typeof header[k] == "object" ? header[k].type : 'string';
                        let cv = row.hasOwnProperty(k) ? (row[k] == null ? '' : row[k]) : "";      
                        if (type == "Number" && !isNaN(cv)) {
                            worksheet.cell(r, c).number(cv || 0);
                        }
                        else if (typeof cv == "number") {
                            worksheet.cell(r, c).number(cv ||0);
                        }
                        else {
                            worksheet.cell(r, c).string((cv || "").toString());
                        }                
                        c++;
                    }
                });
            }
            workbook.writeToBuffer().then(data => {
                callback_fun(false, data);
            }).catch(err => {
                callback_fun(err);
            });
        } catch (err) {
            if (typeof callback_fun != 'function') {
                console.log(err.message);
            } else {
                callback_fun(err);
            }
        }
    }
}

module.exports = ExcelHelper;
