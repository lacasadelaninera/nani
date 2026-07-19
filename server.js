require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Usamos la variable de entorno para no exponer la clave secreta
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Habilitamos CORS para que tu frontend en Netlify pueda comunicarse
app.use(cors({ origin: '*' }));
app.use(express.json());

// Corregimos la ruta para que coincida exactamente con el fetch de tu HTML
app.post('/crear-sesion-pago', async (req, res) => {
    try {
        const { tutor, whatsapp, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío.' });
        }

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

        // Cambiamos las URLs para que redirijan a tu web real en Netlify
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            success_url: 'https://lacasadelaninera.netlify.app/?pago=exitoso', 
            cancel_url: 'https://lacasadelaninera.netlify.app/?pago=cancelado',
            metadata: {
                tutor: tutor,
                whatsapp: whatsapp
            }
        });

        res.json({ stripe_url: session.url });

    } catch (error) {
        console.error('Error al crear la sesión de Stripe:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de pagos corriendo en el puerto ${PORT}`));