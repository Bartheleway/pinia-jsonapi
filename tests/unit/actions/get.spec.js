import { beforeEach, describe, expect, test } from 'vitest'
import * as chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
chai.use(sinonChai)

import { setActivePinia, createPinia } from 'pinia'
import { makeApi } from '../server'
let api, mockApi

import { createJsonapiStore } from '../../../src/pinia-jsonapi'
import defaultJsonapiStore from '../utils/defaultJsonapiStore'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'
import { jsonFormat as createJsonWidget2, normFormat as createNormWidget2 } from '../fixtures/widget2'
import { jsonFormat as createJsonMachine2, normFormat as createNormMachine2 } from '../fixtures/machine2'
import { jsonFormat as createJsonRecord, normFormatWithRels as createNormRecordRels } from '../fixtures/record'
import { createResponseMeta } from '../fixtures/serverResponse'

describe('get', function () {
  let jsonMachine2,
    jsonWidget1,
    jsonWidget2,
    normWidget1,
    normWidget1Rels,
    normMachine2,
    normWidget2,
    normRecordRels,
    jsonRecord,
    meta,
    store,
    config

  beforeEach(function () {
    // Mock up a fake axios-like api instance
    ;[api, mockApi] = makeApi()
    jsonMachine2 = createJsonMachine2()
    jsonWidget1 = createJsonWidget1()
    jsonWidget2 = createJsonWidget2()
    normWidget1 = createNormWidget1()
    normWidget2 = createNormWidget2()
    normMachine2 = createNormMachine2()
    normRecordRels = createNormRecordRels()
    normWidget1Rels = normRecordRels[normWidget1['_jv']['id']]
    jsonRecord = createJsonRecord()
    meta = createResponseMeta()
    setActivePinia(createPinia())
    let jStore = defaultJsonapiStore(api)
    store = jStore.jsonapiStore()
    config = jStore.config
  })

  test('should make an api call to GET item(s)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    normWidget1['_jv']['links']['self'] = 'weirdPath/1'
    await store.get(normWidget1)

    expect(mockApi.history.get[0].url).to.equal(normWidget1['_jv']['links']['self'])
  })

  test('should make an api call to GET a collection', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    delete normWidget1['_jv']['id']
    delete normWidget1['_jv']['links']

    await store.get(normWidget1)
    expect(mockApi.history.get[0].url).to.equal(`${normWidget1['_jv']['type']}`)
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await store.get([normWidget1, { params: params }])
    expect(mockApi.history.get[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await store.get([normWidget1, { url: url }])
    expect(mockApi.history.get[0].url).to.equal(url)
  })

  test('should add record(s) in the store', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let addRecordsMock = sinon.stub(store, 'addRecords')
    await store.get(normWidget1)

    expect(addRecordsMock).to.have.been.calledWith(normWidget1)
  })

  test('should add record(s) (string) in the store', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let addRecordsMock = sinon.stub(store, 'addRecords')
    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await store.get('widget/1')

    expect(addRecordsMock).to.have.been.calledWith(normWidget1)
  })

  test('should return normalized data', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await store.get(normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  test('should handle empty collections', async function () {
    mockApi.onAny().reply(200, { data: { type: 'widgets', data: [] } })

    let res = await store.get('widgets')

    expect(res).to.have.keys('_jv')
  })

  test('should add included record(s) to the store', async function () {
    // included array can include objects from different collections
    const data = {
      data: jsonWidget1,
      included: [jsonWidget2, jsonMachine2],
    }
    mockApi.onAny().reply(200, data)

    let mergeRecordsMock = sinon.stub(store, 'mergeRecords')
    // for a real API call, would need axios include params here
    await store.get(normWidget1)

    // Add isIncluded, remove isData (As would be found in 'real' response)
    normWidget2._jv.isIncluded = true
    normMachine2._jv.isIncluded = true
    delete normWidget2._jv.isData
    delete normMachine2._jv.isData
    let includes = [normWidget2, normMachine2]
    expect(mergeRecordsMock).to.have.been.calledWith(includes)
  })

  test('should return normalized data with expanded rels (single item)', async function () {
    const { jsonapiStore } = createJsonapiStore(
      api,
      {
        followRelationshipsData: true,
      },
      'tmp'
    )
    store = jsonapiStore()
    // Make state contain all records for rels to work
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await store.get(normWidget1)

    expect(res).to.have.all.keys(normWidget1Rels)
  })

  test('should return normalized data with expanded rels (array)', async function () {
    const { jsonapiStore } = createJsonapiStore(
      api,
      {
        followRelationshipsData: true,
      },
      'tmp'
    )
    store = jsonapiStore()
    // Make state contain all records for rels to work
    mockApi.onAny().reply(200, jsonRecord)

    let res = await store.get('widget')

    // Check 'sub-key' equality for each item in the collection
    for (let [key, val] of Object.entries(res)) {
      expect(val).to.have.all.keys(normRecordRels[key])
    }
  })

  test("should handle an empty rels 'data' object", async function () {
    const { jsonapiStore } = createJsonapiStore(
      api,
      {
        followRelationshipsData: true,
      },
      'tmp'
    )
    store = jsonapiStore()
    // Delete contents of data and remove links
    jsonWidget1['relationships']['widgets']['data'] = {}
    delete jsonWidget1['relationships']['widgets']['links']
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await store.get(normWidget1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  test('should preserve json in _jv in returned data', async function () {
    const { jsonapiStore } = createJsonapiStore(api, { preserveJson: true }, 'tmp')
    let str = jsonapiStore()
    // Mock server to only return a meta section
    mockApi.onAny().reply(200, meta)

    let res = await str.get('widget')

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  test('should not preserve json in _jv in returned data', async function () {
    const { jsonapiStore } = createJsonapiStore(api, { preserveJson: false }, 'tmp')
    store = jsonapiStore()
    // Mock server to only return a meta section
    mockApi.onAny().reply(200, meta)

    let res = await store.get('widget')

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  test('should call clearRecords if clearOnUpdate is set for collections', async function () {
    mockApi.onAny().reply(200, { data: [] })

    config.clearOnUpdate = true
    let clearRecordsMock = sinon.stub(store, 'clearRecords')
    await store.get('/widgets')
    expect(clearRecordsMock).to.have.been.called
  })

  test('should not call clearRecords if clearOnUpdate is set for items', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    config.clearOnUpdate = true

    let clearRecordsMock = sinon.stub(store, 'clearRecords')
    await store.get(normWidget1)
    expect(clearRecordsMock).to.not.have.been.called
  })

  test('should call clearRecords with endpoint if clearOnUpdate is set and no data', async function () {
    mockApi.onAny().reply(200, { data: [] })

    config.clearOnUpdate = true

    let endpoint = 'MyEndpoint'
    let clearRecordsMock = sinon.stub(store, 'clearRecords')
    await store.get(endpoint)
    expect(clearRecordsMock).to.have.been.calledWith({ _jv: { type: endpoint } })
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await store.get(normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
