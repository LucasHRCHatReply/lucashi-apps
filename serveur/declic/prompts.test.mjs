import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
const expect = (v) => ({ toHaveLength: (n) => assert.equal(v.length, n), toBe: (x) => assert.equal(v, x), toEqual: (x) => assert.deepEqual(v, x), toBeNull: () => assert.equal(v, null), toBeTypeOf: (t) => assert.equal(typeof v, t), toThrow: (re) => { assert.throws(v, re) } })
import { validerParcours, validerCours, extraireJson, themeValide, normaliser } from './prompts.mjs'

const sources = [{ titre: 'Volcan', url: 'https://fr.wikipedia.org/wiki/Volcan', texte: 'x' }]
const q = { enonce: 'Pourquoi ?', choix: ['a', 'b', 'c', 'd'], bonne: 1, pourquoi: 'Parce que.' }
const carte = (visuel, donnees) => ({ titre: 'T', emoji: '🌋', visuel, donnees, explication: 'Explication.', question: q, source: 1 })
const barres = { items: [{ etiquette: 'A', valeur: 1, unite: 'm' }, { etiquette: 'B', valeur: '2,5', unite: 'm' }, { etiquette: 'C', valeur: 3, unite: 'm' }] }

describe('validerParcours', () => {
  it('accepte 4 cartes valides, borne les textes et remplace la source par son numéro', () => {
    const r = validerParcours({ titre: 'T', accroche: 'a', cartes: Array(4).fill(carte('chiffres', barres)), suite: ['Les océans', '<script>'] }, sources)
    expect(r.cartes).toHaveLength(4)
    expect(r.cartes[0].source.url).toBe('https://fr.wikipedia.org/wiki/Volcan')
    expect(r.cartes[0].donnees.items[1].valeur).toBe(2.5)
    expect(r.suite.some((t) => /[<>]/.test(t))).toBe(false)
  })
  it('garde la bonne réponse au bon endroit après mélange', () => {
    for (let i = 0; i < 20; i++) expect(validerParcours({ titre: 'T', cartes: Array(4).fill(carte('chiffres', barres)) }, sources).cartes[0].question.choix[validerParcours({ titre: 'T', cartes: Array(4).fill(carte('chiffres', barres)) }, sources).cartes[0].question.bonne]).toBeTypeOf('string')
    const r = validerParcours({ titre: 'T', cartes: Array(4).fill(carte('chiffres', barres)) }, sources)
    expect(r.cartes[0].question.choix[r.cartes[0].question.bonne]).toBe('b')
  })
  it('refuse sous 4 cartes valides, un visuel inconnu ou une source inventée', () => {
    expect(() => validerParcours({ titre: 'T', cartes: [carte('chiffres', barres), carte('hologramme', {})] }, sources)).toThrow(/cartes valides/)
    const r = validerParcours({ titre: 'T', cartes: Array(4).fill({ ...carte('chiffres', barres), source: 9 }) }, sources)
    expect(r.cartes[0].source).toBeNull()
  })
  it('refuse une échelle à valeur nulle', () => {
    const e = { items: [{ etiquette: 'A', valeur: 0, unite: '' }, ...barres.items] }
    expect(() => validerParcours({ titre: 'T', cartes: Array(4).fill(carte('echelle', e)) }, sources)).toThrow()
  })
})
describe('validerCours', () => {
  it('exige 4 sections et ne garde que des sources connues', () => {
    const s = { titre: 'S', texte: 'T', visuel: 'frise', donnees: { evenements: Array(4).fill({ annee: '1900', titre: 'e' }) } }
    const r = validerCours({ titre: 'C', intro: 'i', sections: Array(4).fill(s), aretenir: ['a'], sources: [1, 1, 7] }, sources)
    expect(r.sources).toHaveLength(1)
    expect(() => validerCours({ titre: 'C', intro: 'i', sections: [s] }, sources)).toThrow()
  })
})
describe('utilitaires', () => {
  it('extrait le JSON entouré de texte ou de bloc de code', () => expect(extraireJson('Voici :\n```json\n{"a":1}\n```')).toEqual({ a: 1 }))
  it('valide les thèmes', () => { expect(themeValide('Les trous noirs')).toBe(true); expect(themeValide('a')).toBe(false); expect(themeValide('x; rm -rf /')).toBe(false); expect(themeValide('<b>')).toBe(false) })
  it('normalise accents et casse', () => expect(normaliser('  L’Égypte  Ancienne ')).toBe('l’egypte ancienne'))
})
