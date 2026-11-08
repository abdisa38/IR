import jwt from 'jsonwebtoken';
export const JWT_SECRET = process.env.JWT_SECRET || 'ililli_hotel_secure_jwt_secret_2026';
export function requireStaffAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Staff authorization required. Please sign in.',
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const staffRoles = ['admin', 'manager', 'owner', 'kitchen', 'cashier', 'waiter', 'staff'];
        const isStaff = decoded.isStaff === true || staffRoles.includes(String(decoded.role || '').toLowerCase());
        if (!isStaff) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Staff privileges required.',
            });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired session. Please sign in again.',
        });
    }
}
export function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        }
        catch (e) {
            // Optional auth: ignore invalid tokens
        }
    }
    next();
}
