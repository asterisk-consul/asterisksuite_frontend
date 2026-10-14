export type PendingUpload = {
  id: string
  entityKey: string
  entityType: string
  entityId: string
  photoType: string
  fileName: string
  mimeType: string
  size: number
  hash: string
  createdAt: number
  blob: Blob
}

const DB_NAME = 'asterisk-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-uploads'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('entityKey', 'entityKey', { unique: false })
        store.createIndex('hash', 'hash', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function fileHash(file: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('')
}

export async function listPendingUploads(entityType: string, entityId: string) {
  if (!import.meta.client) return []
  const db = await openDatabase()
  return new Promise<PendingUpload[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).index('entityKey').getAll(`${entityType}:${entityId}`)
    request.onsuccess = () => resolve(request.result as PendingUpload[])
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
}

export async function enqueueUpload(file: File, entityType: string, entityId: string, photoType: string) {
  const hash = await fileHash(file)
  const entityKey = `${entityType}:${entityId}`
  const existing = await listPendingUploads(entityType, entityId)
  const duplicate = existing.find(item => item.hash === hash)
  if (duplicate) return duplicate

  const pending: PendingUpload = {
    id: crypto.randomUUID(),
    entityKey,
    entityType,
    entityId,
    photoType,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    hash,
    createdAt: Date.now(),
    blob: file
  }
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(pending)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  db.close()
  return pending
}

export async function removePendingUpload(id: string) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  db.close()
}
