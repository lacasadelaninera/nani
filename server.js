require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors({ origin: '*' }));
app.use(express.json());

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

        // Envío de correo mediante Resend
        if (process.env.RESEND_API_KEY) {
            resend.emails.send({
                from: 'La Casa de la Niñera <onboarding@resend.dev>',
                to: process.env.EMAIL_USER,
                subject: `🔔 Nueva Reserva - ${tutor}`,
                text: `¡Hola! Se ha generado una solicitud de reserva:\n\n` +
                      `👤 Tutor/a: ${tutor}\n` +
                      `📱 WhatsApp: ${whatsapp}\n\n` +
                      `📋 Servicios:\n${resumenServiciosText}\n\n` +
                      `El cliente ha sido derivado a la pasarela de pago.`
            }).then(response => {
                console.log('Correo enviado correctamente vía Resend:', response);
            }).catch(error => {
                console.error('Error al enviar correo vía Resend:', error);
            });
        }

        res.json({ stripe_url: session.url });

    } catch (error) {
        console.error('Error al crear la sesión de Stripe:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
