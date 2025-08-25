const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Crear el transportador (el servicio que enviará el email)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Definir las opciones del email
    const mailOptions = {
        from: `Servicios Express <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    // Enviar el email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;