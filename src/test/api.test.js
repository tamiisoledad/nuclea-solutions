import * as dotenv from 'dotenv';
import moment from 'moment/moment.js';
import chai from "chai";
import supertest from "supertest";
import fetch from "node-fetch";
import sinon from "sinon";
import AlphaModel from "../models/alpha.js";
import AuthorModel from "../models/quotes.js";
import server from "../server.js";

dotenv.config();
moment.locale('es');

const expect = chai.expect;
const requester = supertest('http://localhost:8081');
const alphaMemory = []
let authorsMemory = [{
  author: "George Saunders",
  consultations: [{
    text: "We try, we fail, we posture, we aspire, we pontificate - and then we age, shrink, die, and vanish.",
    consultation_date: "29-05-2023"
  }, {
    text: "We try, we fail, we posture, we aspire, we pontificate - and then we age, shrink, die, and vanish.",
    consultation_date: "31-05-2023"
  }]
}, {
  author: "Maggie Q",
  consultations: [{
    text: "Our choices are going to determine the future for our children, our children's children, and their children. I take that responsibility very seriously.",
    consultation_date: "31-05-2023"
  }]
}];

describe('Tests', () => {
  after(() => {
    process.exit()
  })

  describe('testing alpha and flatten', () => {
    before(() => {
     sinon.stub(AlphaModel, 'create').callsFake((data) => {
      alphaMemory.push(data)
     })

     sinon.stub(AlphaModel, 'findOne').callsFake((data) => alphaMemory.find((a) => JSON.stringify(a) === JSON.stringify(data)))
    })

    it('The method must alphabetically sort the keys of the object', async () => {
      const obj = {
        flor: 'Jazmin',
        animal: "Perro",
        pais: "Argentina"
      }

      const response = await requester.put('/alpha').send(obj)

      expect(JSON.stringify(response.body)).to.equal(JSON.stringify({ animal: 'Perro', flor: 'Jazmin', pais: 'Argentina' }))
    })

    it('Check if it was successfully saved in the database', async () => {
      const obj = { animal: 'Perro', flor: 'Jazmin', pais: 'Argentina' }
      const objFounded = await AlphaModel.findOne(obj);

      expect(objFounded).to.exist
    })

    it('Check that there are no arrays within the object', async () => {
      const obj = {
        fruta: "manzana",
        animal: "zebra",
        cityList: [
        "sunnyvale",
        "sanjose"
        ]
      }

      const response = await requester.post('/flatten').send(obj);

      for (const key in response.body) {
        expect(response.body[key]).to.not.be.an('array')
      }
    })

    it('Verify that it returns the expected value', async () => {
      const obj = {
        fruta: "manzana",
        animal: "zebra",
        cityList: [
        "sunnyvale",
        "sanjose"
        ]
      }
      const objExpected = {
        fruta: "manzana",
        animal: "zebra",
        cityList: "sunnyvale,sanjose"
      }

      const response = await requester.post('/flatten').send(obj);

      expect(JSON.stringify(response.body)).to.equal(JSON.stringify(objExpected))
    })
  })


  describe('Testing quote and quotes', () => {
    before(async () => {
      sinon.stub(AuthorModel, 'findOne').callsFake(() => {
        const data = {
          author: 'Barack Obama'
        }
        const authorFound = authorsMemory.find((a) => a.author === data.author);
        const authorIndex = authorsMemory.findIndex(a => a.author === data.author);

        if (authorFound) {
          return authorsMemory[authorIndex].consultations.push({
            text: 'Lorem impsum dolor amet',
            consultation_date: moment().format('DD-MM-YYYY')
          })
        } else {
          sinon.stub(AuthorModel, 'create').callsFake(res => {
            authorsMemory.push({
              author: data.author,
              consultations: [{
                text: 'Lorem impsut',
                consultation_date: moment().format('DD-MM-YYYY')
              }]
            })
          })
        }
      })
    })

    after(() => {
      sinon.restore();
    })

    it('Verify that the data has been saved in the database', async () => {
      await requester.post('/quote')
      const authorFounded = authorsMemory.find(a => a.author === 'Barack Obama')
      expect(authorFounded).to.exist
    })

    it("Verifica que no se guarde dos veces el mismo autor", async () => {
      await requester.post('/quote')
      const foundAuthors = authorsMemory.filter(a => a.author === 'Barack Obama').length;

      expect(foundAuthors).to.equal(1)
    })

    it('Verify that the authors are sorted alphabetically', async() => {
      sinon.stub(AuthorModel, 'find').callsFake(() => {
        return authorsMemory
      })
      const expected = JSON.stringify(["Barack Obama", "George Saunders", "Maggie Q"])
      const response = await requester.get('/quotes');
      const properties = response.body.map((obj) => Object.keys(obj)[0])

      expect(JSON.stringify(properties)).to.equal(expected);
    })

    it('Verify that the phrases come in descending order by date', async () => {
      const response = await requester.get('/quotes');
      const expected = JSON.stringify({"George Saunders":[{"quote":"We try, we fail, we posture, we aspire, we pontificate - and then we age, shrink, die, and vanish.","consultation_date":"31-05-2023"},{"quote":"We try, we fail, we posture, we aspire, we pontificate - and then we age, shrink, die, and vanish.","consultation_date":"29-05-2023"}]})
      const georgeSaunders = JSON.stringify(response.body[1])

      expect(georgeSaunders).to.equal(expected)
    })
  })
})
