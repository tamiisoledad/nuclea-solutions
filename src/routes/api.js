import express from 'express';
import moment from 'moment/moment.js';
import fetch from 'node-fetch';
import AlphaModel from '../models/alpha.js';
import AuthorModel from '../models/quotes.js';
import logger from '../utils/winston.js';

const router = express.Router();
moment.locale('es');

router.put('/alpha', async (req, res) => {
  try {
    const { body } = req;
    const keys = [];
    const newJson = {};

    for (const key in body) {
      keys.push(key)
    }

    for (const key of keys.sort()) {
      newJson[key] = body[key]
    }

    await AlphaModel.create({...newJson})

    res.json(newJson)
  } catch (error) {
    logger.error('Error en la ruta /alpha:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/flatten', (req, res) => {
  try {
    const {body} = req;
    const newJson = {};

    for (const key in body) {
      if (Array.isArray(body[key])) {
       newJson[key] = body[key].join(',');
      } else {
        newJson[key] = body[key]
      }
    }

    res.json(newJson)
  } catch (error) {
    logger.error('Error en la ruta /flatten:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

})

router.post('/quote', async (req, res) => {
  try {
    const response = await fetch('https://quote-garden.onrender.com/api/v3/quotes/random')
    const result = await response.json();

    if (!result.data) {
      logger.error('Error en https://quote-garden.onrender.com/api/v3/quotes/random');
      res.status(500).json({ error: 'External Error' });

      return;
    }

    const author = result.data[0].quoteAuthor;
    const consult = {
      text: result.data[0].quoteText,
      consultation_date: moment().format('DD-MM-YYYY')
    }

    const authorFound = await AuthorModel.findOne({ author });

    if (authorFound) {
      if(process.env.NODE_ENV !== 'test') {
        authorFound.consultations.push(consult);

        authorFound.save();
      }
    } else {
      AuthorModel.create({ author, consultations: [consult]})
    }

    res.json({author, ...consult});
  } catch (error) {
    logger.error('Error en la ruta /quote:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.get('/quotes', async (req, res) => {
  try {
    const quotes = await AuthorModel.find({});
    let orderedQuotes = quotes.sort((a, b) => {
      const authorA = a.author.toLowerCase();
      const authorB = b.author.toLowerCase();

      if (authorA < authorB) {
        return -1;
      }
      if (authorA > authorB) {
        return 1;
      }
      return 0;
    });

    const result = [];

    for (const item of orderedQuotes) {
      const data = {
        [item.author]: []
      }
      const sortedByDate = item.consultations.sort((a, b) => {
        const dateA = new Date(a.consultation_date.split("-").reverse().join("-"));
        const dateB = new Date(b.consultation_date.split("-").reverse().join("-"));

        return dateB - dateA;
      })

      for (const iterator of sortedByDate) {
        data[item.author].push({
          id: iterator._id,
          quote: iterator.text,
          consultation_date: iterator.consultation_date
        })
      }

      result.push(data)
    }

    res.json(result)
  } catch (error) {
    logger.error('Error en la ruta /quotes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

export default router;