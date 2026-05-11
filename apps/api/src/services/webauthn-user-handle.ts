/** Packs vendor + actor into a WebAuthn user.id (max 64 bytes). */

export type WebAuthnActorKind = 'member' | 'staff'

const MEMBER_KIND = 0x01
const STAFF_KIND = 0x02
const UUID_BYTES = 16
const HANDLE_LEN = 1 + UUID_BYTES + UUID_BYTES

function uuidStringToBytes(uuid: string): Buffer {
    const hex = uuid.replace(/-/g, '')
    if (hex.length !== 32) {
        throw new Error('Invalid UUID string')
    }
    return Buffer.from(hex, 'hex')
}

function bytesToUuidString(buf: Buffer): string {
    const hex = buf.toString('hex')
    if (hex.length !== 32) {
        throw new Error('Invalid UUID bytes')
    }
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function packWebAuthnUserHandle(kind: WebAuthnActorKind, vendorId: string, actorId: string): Buffer {
    const k = kind === 'member' ? MEMBER_KIND : STAFF_KIND
    const v = uuidStringToBytes(vendorId)
    const a = uuidStringToBytes(actorId)
    return Buffer.concat([Buffer.from([k]), v, a])
}

function toBuffer(buf: Buffer | Uint8Array | ArrayBuffer | null | undefined): Buffer {
    if (buf == null) {
        return Buffer.alloc(0)
    }
    if (Buffer.isBuffer(buf)) {
        return buf
    }
    if (buf instanceof ArrayBuffer) {
        return Buffer.from(buf)
    }
    return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)
}

export function unpackWebAuthnUserHandle(buf: Buffer | Uint8Array | ArrayBuffer | null | undefined): {
    kind: WebAuthnActorKind
    vendorId: string
    actorId: string
} {
    const b = toBuffer(buf)
    if (b.length !== HANDLE_LEN) {
        throw new Error('Invalid WebAuthn user handle length')
    }
    const k = b[0]
    if (k !== MEMBER_KIND && k !== STAFF_KIND) {
        throw new Error('Invalid WebAuthn user handle kind')
    }
    const vendorId = bytesToUuidString(b.subarray(1, 1 + UUID_BYTES))
    const actorId = bytesToUuidString(b.subarray(1 + UUID_BYTES, HANDLE_LEN))
    return { kind: k === MEMBER_KIND ? 'member' : 'staff', vendorId, actorId }
}

export function assertWebAuthnVendorMatch(expectedVendorId: string, parsedVendorId: string): void {
    if (parsedVendorId !== expectedVendorId) {
        const err = new Error('Passkey is not valid for this store') as Error & {
            statusCode: number
            code: string
        }
        err.statusCode = 403
        err.code = 'PASSKEY_VENDOR_MISMATCH'
        throw err
    }
}
