require('dotenv').config();[cite: 5]
const express = require('express');[cite: 5]
const cors = require('cors');[cite: 5]
const nodemailer = require('nodemailer');[cite: 3]
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);[cite: 5]

const app = express();[cite: 5]

app.use(cors({ origin: '*' }));[cite: 5]
app.use(express.json());[cite: 5]

// Configuración opcional de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/crear-sesion-pago', async (req, res) => {[cite: 5]
    try {
        const { tutor, whatsapp, items } = req.body;[cite: 5]

        if (!items || items.length === 0) {[cite: 5]
            return res.status(400).json({ error: 'El carrito está vacío.' });[cite: 5]
        }

        const resumenServiciosText = items.map(i => `- ${i.nombre} (Cantidad: ${i.quantity || 1})`).join('\n');

        const line_items = items.map(item => {[cite: 5]
            return {
                price_data: {[cite: 5]
                    currency: 'eur',[cite: 5]
                    product_data: {[cite: 5]
                        name: item.nombre,[cite: 5]
                    },
                    unit_amount: item.precioEuroCentavos,[cite: 5]
                },
                quantity: item.quantity || 1,[cite: 5]
            };
        });

        const session = await stripe.checkout.sessions.create({[cite: 5]
            payment_method_types: ['card', 'bizum'],[cite: 5]
            line_items: line_items,[cite: 5]
            mode: 'payment',[cite: 5]
            success_url: 'https://lacasadelaninerazizur.netlify.app/?pago=exitoso',[cite: 5]
            cancel_url: 'https://lacasadelaninerazizur.netlify.app/?pago=cancelado',[cite: 5]
            metadata: {[cite: 5]
                tutor: tutor,[cite: 5]
                whatsapp: whatsapp,[cite: 5]
                resumen: resumenServiciosText
            }
        });

        // Intentar enviar el correo si las variables están configuradas
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

        res.json({ stripe_url: session.url });[cite: 5]

    } catch (error) {[cite: 5]
        console.error('Error al crear la sesión de Stripe:', error);[cite: 5]
        res.status(500).json({ error: error.message });[cite: 5]
    }
});

const PORT = process.env.PORT || 3000;[cite: 5]
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));[cite: 5]
