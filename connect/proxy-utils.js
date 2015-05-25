exports.portForRedirectUrl = function(port, protocol) {
  // return non empty for port/protocol combinations other than: 80/http, 443/https
  if( port == 80 && protocol == 'http') {
    return '';
  } else if (port == 443 && protocol == 'https') {
    return '';
  }
  return ':' + port;
}


