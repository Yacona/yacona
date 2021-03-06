// --- Modules --- //

const Controller = require( './Controller' ).Controller

const moduleLoader = require( '../support/moduleLoader' )

const utility = moduleLoader( 'utility' )
const file    = moduleLoader( 'file' )

// --- Functions --- //

const debug = ( name, message ) => {
  return utility.debug( 'red', 'app (' + name + ')', message )
}

const generateAppId = () => Math.random().toString( 36 ).slice( -8 )

// --- Store : Declare private member and method --- //

const store = new WeakMap()

// --- App Class --- /

class App {

  constructor( yacona, chdir ){
    const src = utility.absPath( chdir, 'package.json' )
		const packageJson = utility.exists( src )
			? JSON.parse( file.read( src ).result )
			: {}

    if( packageJson.main === undefined )
  		packageJson.main = 'app'

    const name = packageJson.name || chdir.split( /\/|\\/ ).pop()

    store.set( this, {
      yacona    : yacona,
      chdir     : chdir,
      id        : generateAppId(),
      name      : name,
      package   : packageJson,
      isRunning : false,
      controller: null,
      instance  : null,

      // This params using on close event
      routes    : { get: [], post: [], put: [], delete: [] },
      windows   : [],
      sockets   : [],
      listeners : [],

      env       : {}
    } )
  }
	
  getInstance(){
    return store.get( this ).instance
  }

  getYacona(){
    return store.get( this ).yacona
  }

  getName(){
    return store.get( this ).name
  }

  getChdir(){
    return store.get( this ).chdir
  }

  getId(){
    return store.get( this ).id
  }

  getPackage(){
    return JSON.parse( JSON.stringify( store.get( this ).package ) )
  }

  getController(){
    return store.get( this ).controller
  }

  isRunning(){
    return store.get( this ).isRunning
  }

  launch(){
    const self = store.get( this )

    if( self.isRunning )
			return false

		self.isRunning  = true
		self.instance   = require( utility.absPath( self.chdir, self.package.main ) )
    self.controller = new Controller( this )

    debug( this.getName() + ':' + this.getId(), 'Launched' )

		if( self.instance !== null && self.instance.launch ){
			self.instance.launch( self.controller )
    }

		return self.controller
  }

  close(){
    const self = store.get( this )

		if( self.isRunning === true ){
			self.isRunning = false

      // Express

      self.routes.get.forEach( route => this.removeGet( route ) )
      self.routes.post.forEach( route => this.removePost( route ) )
      self.routes.put.forEach( route => this.removePut( route ) )
      self.routes.delete.forEach( route => this.removeDelete( route ) )

      // Socket.io

      this.removeWebSocket()

      // Electron
      // GUI Class

      store.get( this ).yacona.destroyWindow( this.getId() )

      self.windows = []

      // Close

      self.instance   = undefined
      self.controller = undefined

      // Event

      self.listeners.forEach( listen => this.removeListener( listen ) )

      self.listeners = []

      debug( this.getName() + ':' + this.getId(), 'Closed' )

			return true
		}

		return false
	}

  // --- Wrap --- //

  // --- Socket --- //

  addWebSocket( func ){
    const self = store.get( this )
    return self.yacona.addWebSocket( '/' + this.getName() + '/', func )
  }

  removeWebSocket(){
    const self = store.get( this )
    return self.yacona.removeWebSocket( '/' + this.getName() + '/' )
  }

  // --- Documents --- //

  saveDocument( filePath, content ){
    return store.get( this ).yacona.saveDocument( this.getName() + '/' + filePath, content )
  }

  loadDocument( filePath ){
    return store.get( this ).yacona.loadDocument( this.getName() + '/' + filePath )
  }

  saveAppData( filePath, content ){
    return store.get( this ).yacona.saveAppData( this.getName() + '/' + filePath, content )
  }

  loadAppData( filePath ){
    return store.get( this ).yacona.loadAppData( this.getName() + '/' + filePath )
  }

  // --- Express --- //

  get( ...args ){
    let route = args[0]
    args[0] = '/' + this.getName() + args[0]
    const self = store.get( this )
    self.routes.get.push( route )
    return self.yacona.get.apply( self.yacona, args )
  }

  post( ...args ){
    let route = args[0]
    args[0] = '/' + this.getName() + args[0]
    const self = store.get( this )
    self.routes.post.push( route )
    return self.yacona.post.apply( self.yacona, args )
  }

  put( ...args ){
    let route = args[0]
    args[0] = '/' + this.getName() + args[0]
    const self = store.get( this )
    self.routes.put.push( route )
    return self.yacona.put.apply( self.yacona, args )
  }

  delete( ...args ){
    let route = args[0]
    args[0] = '/' + this.getName() + args[0]
    const self = store.get( this )
    self.routes.delete.push( route )
    return self.yacona.delete.apply( self.yacona, args )
  }

  removeGet( route ){
    const self = store.get( this )

    let index = self.routes.get.indexOf( route )
    if( index !== -1 )
      self.routes.get.splice( index, 1 )

    return self.yacona.removeGet( '/' + this.getName() + route )
  }

  removePost( route ){
    const self = store.get( this )

    let index = self.routes.post.indexOf( route )
    if( index !== -1 )
      self.routes.post.splice( index, 1 )

    return self.yacona.removePost( '/' + this.getName() + route )
  }

  removePut( route ){
    const self = store.get( this )

    let index = self.routes.put.indexOf( route )
    if( index !== -1 )
      self.routes.put.splice( index, 1 )

    return self.yacona.removePut( '/' + this.getName() + route )
  }

  removeDelete( route ){
    const self = store.get( this )

    let index = self.routes.delete.indexOf( route )
    if( index !== -1 )
      self.routes.delete.splice( index, 1 )

    return self.yacona.removeDelete( '/' + this.getName() + route )
  }

  getPort(){
    return store.get( this ).yacona.getPort()
  }

  getUrl(){
    return '127.0.0.1:' + String( this.getPort() ) + '/' + this.getName() + '/'
  }

  // --- Create Window --- //

  createWindow( options ){
    const self = store.get( this )

    return new Promise( ( resolve, reject ) => {
      self.yacona.createWindow( options )
        .then( main => {
          main.app = this
          debug( this.getName() + ':' + this.getId(), 'loadURL => ' + 'http://' + this.getUrl() )
          self.windows.push( main )

          main.loadURL( 'http://' + this.getUrl() + '/' )
	  main.on( 'closed', () => {
            for( let i=0; i<self.windows.length; i++ )
              if( self.windows[i].original_id === main.original_id ){
                self.windows.splice( i, 1 )
                break
              }
          } )
          resolve( main )
        } )
        .catch( reject )
    } )
  }

  destroyWindow( window ){
    return store.get( this ).yacona.destroyWindow( window )
  }

  // --- Event --- //

  addListener( name, callback ){
    const self = store.get( this )
    self.listeners.push( name )
    debug( this.getName() + ':' + this.getId(), 'Add listener ' + name )
    return self.yacona.addListener( this.getName() + '/' + name, callback )
  }

  callListener( name, ...args ){
    const self = store.get( this )
    return self.yacona.callListener.apply( self.yacona, [name].concat( args ) )
  }

  removeListener( name ){
    const self = store.get( this )

    let i
    if( ( i = self.listeners.indexOf( name ) ) !== -1 ){
      self.listeners.splice( i, 1 )
      debug( this.getName() + ':' + this.getId(), 'Remove listener ' + name )
    }

    return self.yacona.removeListener( this.getName() + '/' + name )
  }

  // --- App Control --- //

  attachApp( path ){
    if( path === undefined )
      return null

    const self = store.get( this )
    if( utility.isAbsPath( path ) === true )
      return self.yacona.attachApp( path )
    else
      return self.yacona.attachApp( utility.absPath( self.chdir, path ) )
  }

  addApp( url ){
    return store.get( this ).yacona.addApp( url )
  }

  removeApp( name ){
    return store.get( this ).yacona.removeApp( name )
  }

  getAppPath( name ){
    return store.get( this ).yacona.getAppPath( name )
  }

  getAllApps(){
    return store.get( this ).yacona.getAllApps()
  }

}

module.exports.App = App
