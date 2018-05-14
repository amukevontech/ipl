require('dotenv').config();

function envFor(name, defaultValue = null){
    if (process.env[`SC_${name}`] != undefined) {
        return process.env[`SC_${name}`]
    }
    return defaultValue
}


class AppConfig {	
    constructor() {
        this.name = 'CricketAPI Spider';
        this.port = envFor("PORT", 5000);
        this.enable_memcache = envFor("ENABLE_MEMCACHE", false);
        if (this.enable_memcache == 'true'){
            this.enable_memcache = true;
        } else {
            this.enable_memcache = false;
        }
        this.path = {
            static: '/static'
        };
        
        this.img = {
            static: 'https://s3-ap-southeast-1.amazonaws.com/litzscore/'
        }
            
        this.backend = {
            host: 'https://rest.cricketapi.com',
            spiderHost: 'https://rest.cricketapi.com', //'http://localhost:5000',
            path: '/',
            };
        this.site_url = {
            nodehost: 'http://localhost:5000/',
            phphost: 'http://localhost/rotobashadmin/'
        };
        // this.auth = {
        //     app_id: envFor("APP_ID"), // get it from .env
        //     access_key: envFor("ACCESS_KEY"),
        //     secret_key: envFor("SECRET_KEY"),
        //     device_id: envFor("DEVICE_ID")
        // }
        
        this.auth = {
            app_id: "rapl",
            access_key: "3475b10dad7c1fd2db845684b71e1f0e",
            secret_key: "af17b40ed75099415037424bc79b90fe",
            device_id: "abr344mkd99"
        }
    }
  }

module.exports = new AppConfig();