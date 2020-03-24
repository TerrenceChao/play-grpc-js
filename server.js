'use strict'

const PROTO_PATH = 'pb/messages.proto'

const fs = require('fs')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}
const packageDef = protoLoader.loadSync(PROTO_PATH, options)
const serviceDef = grpc.loadPackageDefinition(packageDef)

const employees = require('./employees').employees

const PORT = 3000

const cacert = fs.readFileSync('certs/ca.crt')
const cert = fs.readFileSync('certs/server.crt')
const key = fs.readFileSync('certs/server.key')
const kvpair = {
  private_key: key,
  cert_chain: cert
}
const creds = grpc.ServerCredentials.createSsl(cacert, [kvpair])

const server = new grpc.Server()
server.addService(serviceDef.EmployeeService.service, {
  getByBadgeNumber,
  getAll,
  save,
  saveAll,
  addPhoto
})

server.bind(
  `localhost:${PORT}`,
  grpc.ServerCredentials.createInsecure() //creds //
)
console.log(`Starting server on port ${PORT}`)
server.start()

function getByBadgeNumber (call, callback) {
  const md = call.metadata.getMap()
  for (const key in md) {
    console.log(key, md[key])
  }

  // client request
  const badgeNumber = call.request.badgeNumber

  for (let i = 0; i < employees.length; i++) {
    if (employees[i].badgeNumber === badgeNumber) {
      callback(null, { employee: employees[i] })
      return
    }
  }

  const errMsg = 'error'
  callback(errMsg)
}

function getAll (call) {
  employees.forEach(emp => call.write({ employee: emp }))
  call.end()
}

function save (call, callback) {

}

function saveAll (call) {
  call.on('data', req => {
    employees.push(req.employee)
    call.write({ employee: req.employee })
  })
  call.on('end', () => {
    employees.forEach(emp => console.log(emp))
    call.end()
  })
}

function addPhoto (call, callback) {
  const md = call.metadata.getMap()
  for (const key in md) {
    console.log(key, md[key])
  }

  let result = Buffer.alloc(0)
  call.on('data', data => {
    result = Buffer.concat([result, data.data])
    console.log(`Message received with size ${data.data.length}`)
  })
  call.on('end', () => {
    callback(null, { isOk: true })
    console.log(`Total file size: ${result.length}`)
  })
}
