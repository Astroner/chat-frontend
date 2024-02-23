export const getHash = (data: ArrayBuffer) => {
    return crypto.subtle.digest("SHA-256", data);
}