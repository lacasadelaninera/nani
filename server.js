require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// Dentro de tu app.post('/crear-sesion-pago', ...)
if (process.env.RESEND_API_KEY) {
    try {
        await resend.emails.send({
            from: 'La Casa de la Niñera <onboarding@resend.dev>',
            to: process.env.EMAIL_USER, // Tu correo de destino
            subject: `🔔 Nueva Reserva - ${tutor}`,
            text: `¡Hola! Se ha generado una solicitud de reserva:\n\n` +
                  `👤 Tutor/a: ${tutor}\n` +
                  `📱 WhatsApp: ${whatsapp}\n\n` +
                  `📋 Servicios:\n${resumenServiciosText}\n\n` +
                  `El cliente ha sido derivado a la pasarela de pago.`
        });
        console.log('Correo enviado con éxito vía Resend');
    } catch (mailError) {
        console.error('Error al enviar correo con Resend:', mailError);
    }
}

app.post('/crear-sesion-pago', async (req, res) => {
    try {
        const { tutor, whatsapp, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío.' });
        }

        const resumenServiciosText = items.map(i => `- ${i.nombre} (Cantidad: ${i.quantity || 1})`).join('\n');

        const line_items = items.map(item => {
            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.nombre,
                    },
                    unit_amount: item.precioEuroCentavos,
                },
                quantity: item.quantity || 1,
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'bizum'],
            line_items: line_items,
            mode: 'payment',
            success_url: 'https://lacasadelaninerazizur.netlify.app/?pago=exitoso',
            cancel_url: 'https://lacasadelaninerazizur.netlify.app/?pago=cancelado',
            metadata: {
                tutor: tutor,
                whatsapp: whatsapp,
                resumen: resumenServiciosText
            }
        });

        // Envío de correo si las credenciales existen
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: `🔔 Nueva Reserva - ${tutor}`,
                text: `¡Hola! Se ha generado una solicitud de reserva:\n\n` +
                      `👤 Tutor/a: ${tutor}\n` +
                      `📱 WhatsApp: ${whatsapp}\n\n` +
                      `📋 Servicios:\n${resumenServiciosText}\n\n` +
                      `El cliente ha sido derivado a la pasarela de pago.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.error('Error al enviar correo:', error);
                else console.log('Correo enviado correctamente:', info.response);
            });
        }

        res.json({ stripe_url: session.url });

    } catch (error) {
        console.error('Error al crear la sesión de Stripe:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
