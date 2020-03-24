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

const PORT = 3000

const cacert = fs.readFileSync('certs/ca.crt')
const cert = fs.readFileSync('certs/client.crt')
const key = fs.readFileSync('certs/client.key')
const creds = grpc.credentials.createSsl(cacert, key, cert)

const client = new serviceDef.EmployeeService(
  `localhost:${PORT}`,
  grpc.credentials.createInsecure() //creds //
)

const option = parseInt(process.argv[2], 10)
switch (option) {
  case 1:
    sendMetadata(client)
    break

  case 2:
    getByBadgeNumber(client)
    break

  case 3:
    getAll(client)
    break

  case 4:
    addPhoto(client)
    break

  case 5:
    saveAll(client)
    break
}

function sendMetadata (client) {
  const md = new grpc.Metadata()
  md.add('username', 'Albert')
  md.add('password', '1111')
  client.getByBadgeNumber({}, md, () => {})
}

function getByBadgeNumber (client) {
  client.getByBadgeNumber({ badgeNumber: 2028 }, (err, response) => {
    if (err) {
      console.log(err)
    } else {
      console.log(response.employee)
    }
  })
}

function getAll (client) {
  const call = client.getAll({}) // there's no 'null' in rpc request, you should use '{}' instead of 'null'
  call.on('data', data => {
    console.log(data.employee)
  })
}

function addPhoto (client) {
  const md = new grpc.Metadata()
  md.add('bagdenumber', '2020')
  const call = client.addPhoto(md, (err, response) => {
    if (err) {
      console.log(err)
    } else {
      console.log(response)
    }
  })

  const stream = fs.createReadStream('public/hallstatt.jpg')
  stream.on('data', chunk => {
    call.write({ data: chunk })
  })

  stream.on('end', () => call.end())
}

function saveAll (client) {
  const newEmployees = [
    {
      badgeNumber: 9527,
      firstName: 'Albert',
      lastName: 'Chao',
      vacationAccrualRate: 1.2,
      vacationaccrued: 30.5
    },
    {
      badgeNumber: 2048,
      firstName: 'Elton',
      lastName: 'John',
      vacationAccrualRate: 3.88,
      vacationaccrued: 12
    }
  ]

  const call = client.saveAll()
  call.on('data', resStream => {
    console.log(resStream.employee)
  })
  newEmployees.forEach(newOne => {
    call.write({ employee: newOne })
  })
  call.end()
}
