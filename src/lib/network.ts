import ip from 'ip';
import os from 'os';

export function getLocalIp(): string {
    // Try to find the most likely LAN IP
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            // Skip internal (localhost) and non-IPv4
            if (iface.family === 'IPv4' && !iface.internal) {
                // Prefer common LAN ranges
                if (
                    iface.address.startsWith('192.168.') ||
                    iface.address.startsWith('10.') ||
                    (iface.address.startsWith('172.') && parseInt(iface.address.split('.')[1], 10) >= 16 && parseInt(iface.address.split('.')[1], 10) <= 31)
                ) {
                    return iface.address;
                }
            }
        }
    }

    // Fallback to ip lib or 127.0.0.1
    return ip.address() || '127.0.0.1';
}
