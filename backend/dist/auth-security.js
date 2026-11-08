export function validateGoogleTokenInfo(claims, expectedClientId, nowSeconds = Math.floor(Date.now() / 1000)) {
    if (!claims || !expectedClientId)
        return null;
    const issuer = claims.iss;
    const expiration = Number(claims.exp);
    if (claims.aud !== expectedClientId ||
        (issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") ||
        !Number.isFinite(expiration) ||
        expiration <= nowSeconds ||
        claims.email_verified !== "true" ||
        typeof claims.sub !== "string" ||
        !claims.sub ||
        typeof claims.email !== "string" ||
        !claims.email) {
        return null;
    }
    return {
        sub: claims.sub,
        email: claims.email,
        ...(typeof claims.name === "string" ? { name: claims.name } : {}),
        ...(typeof claims.picture === "string" ? { picture: claims.picture } : {}),
        ...(typeof claims.given_name === "string" ? { given_name: claims.given_name } : {}),
    };
}
