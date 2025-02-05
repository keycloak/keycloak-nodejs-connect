import requester from 'keycloak-request-token'

const baseUrl = 'http://127.0.0.1:8080'
const defaultSettings = {
  username: 'test-admin',
  password: 'password',
  grant_type: 'password',
  client_id: 'admin-app',
  realmName: 'service-node-realm'
}

export default function getToken (options) {
  const settings = Object.assign({}, defaultSettings, options)
  return requester(baseUrl, settings)
}
