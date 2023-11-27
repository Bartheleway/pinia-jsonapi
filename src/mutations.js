/**
 * Pinia mutations, used via `this.$store.commit()`
 *
 * @namespace mutations
 * @memberof module:jsonapi-pinia.createJsonapiStore
 */

import { utils } from './jsonapi-pinia'

export default () => {
  return {
    /**
     * Delete a record from the store.
     * @memberof module:jsonapi-pinia.createJsonapiStore.mutations
     * @param {object} state - The Pinia state object
     * @param {(string|object)} record - The record to be deleted
     */
    deleteRecord: (state, record) => {
      const [type, id] = utils.getTypeId(record, false)
      if (!type || !id) {
        throw `deleteRecord: Missing type or id: ${record}`
      }
      try {
        delete state[type][id]
      } catch (err) {
        if (err instanceof TypeError) {
          // Trying to delete non-existent object - ignore
        } else {
          throw err
        }
      }
    },
    /**
     * Add record(s) to the store, according to `mergeRecords` config option
     * @memberof module:jsonapi-pinia.createJsonapiStore.mutations
     * @param {object} state - The Pinia state object
     * @param {object} records - The record(s) to be added
     */
    addRecords: (state, records) => {
      utils.updateRecords(state, records)
    },
    /**
     * Replace (or add) record(s) to the store
     * @memberof module:jsonapi-pinia.createJsonapiStore.mutations
     * @param {object} state - The Pinia state object
     * @param {object} records - The record(s) to be replaced
     */
    replaceRecords: (state, records) => {
      utils.updateRecords(state, records, false)
    },
    /**
     * Merge (or add) records to the store
     * @memberof module:jsonapi-pinia.createJsonapiStore.mutations
     * @param {object} state - The Pinia state object
     * @param {object} records - The record(s) to be merged
     */
    mergeRecords: (state, records) => {
      utils.updateRecords(state, records, true)
    },
    /**
     * Delete all records from the store (of a given type) other than those included in a given record
     * @memberof module:jsonapi-pinia.createJsonapiStore.mutations
     * @param {object} state - The Pinia state object
     * @param {object} records - A record with type set.
     */
    clearRecords: (state, records) => {
      Object.assign(state, utils.normToStore(records))
    },
  }
}
