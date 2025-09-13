function normalizeIp(ip) {
  if (!ip) return '';
  // Handle IPv6 localhost (::1)
  if (ip === '::1') return '127.0.0.1';
  // Handle IPv6 mapped IPv4 (::ffff:192.168.29.34)
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
}

module.exports=normalizeIp;