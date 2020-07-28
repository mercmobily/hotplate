const cookieParser = require('cookie-parser')
const express = require('express')
const logger = require('morgan')
const vars = require('./vars.js')
const expressSession = require('express-session')
const expressMySqlSession = require('express-mysql-session')
const makeDbConnection = require('./lib/makeDbConnection.js')
const serveStaticFiles = require('./routes/serveStaticFiles.js')
const e = require('allhttperrors')
const path = require('path')
const errorPageRoute = require('./routes/errorPage')
const JsonRestStores = require('jsonreststores')
const maybeRedirectToHttps = require('./routes/maybeRedirectToHttps')
const asyncMiddleware = require('./lib/asyncMiddleware') /*  eslint-disable-line */

// Print unhandled exception if it happens. This will prevent unmanaged
// errors going silent
process.on('unhandledRejection', (e, p) => {
  console.log('UNHANDLED REJECTION!', e, 'PROMISE:', p)
})

// Create the express app
const app = express()

// This will be used by the `www` executable to set the server port
app._serverPort = vars.config.serverPort

// Redirect to HTTPS for production
app.use(maybeRedirectToHttps)

// Enable the logger
app.use(logger())

// Make up request.body, based on urlencoded or json inputs
app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ limit: '4mb', extended: false }))
app.use(cookieParser())

// Make up the session store and the session
vars.connection = makeDbConnection(vars.config.db)
const MySQLStore = expressMySqlSession(expressSession)
const sessionStore = new MySQLStore({}, vars.connection)
const session = expressSession({
  key: 'js-kit',
  secret: 'YOU NEED TO CHANGE THIS',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 * 26 }
})

/* ### STATIC FILES ### */

// Will serve the app using using es-dev-server (debugging, unbuilt) or
// always serving index.html
serveStaticFiles(app)

/* ### SESSION ### */

// Set the session. This happens after static files, otherwise
// the sessions table will be potentially _very_ polluted
app.use(session)

/* ### ROUTES ### */

/* ### STORES ### */

// Automatically include all stores in stores/2.0 and listen to them all
JsonRestStores.requireStoresFromPath(path.join(__dirname, 'stores/1.0'), app)

// Error handler page
app.use(errorPageRoute)

// Artificially call the errorPageRoute as "not found"
app.use((req, res) => errorPageRoute(new e.NotFoundError(), req, res))

app._readyChecker = async function () {
  /* ### BEGIN OF READY CHECKER ### */

  /* ### END OF READY CHECKER ### */
  return true
}

// app.use(express.static(path.join(__dirname, 'public')));
module.exports = app
