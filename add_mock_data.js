/**
 * Created by dconway on 13/05/15.
 */
'use strict';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var supertest = require('supertest-as-promised');
var request   = supertest('https://dev.peat-platform.org');
var inter_request   = supertest('https://dev.peat-platform.org:8443');
var assert    = require('chai').assert;
var profiles  = require('./data/mock_profiles_array.json')
var location  = require('./data/mock_location_label_array.json')


var api_key = "25771ed70676edf6676af746182e2562"
var secret  = "e60d89bae9141b499c9a33c8936cc8501c9b0589f7bc708bb90e39a444a2570a"

var profile_type_id  = "t_d9abae8cdd1a681aec9cea295b61c15f-720"
var location_type_id = "t_0efe4d496756ece82b87e7567ba9ecce-377"

var permissions

var profile_type  = {
   "@reference": "Mock User Profile",
   "@context": [
      {
         "@property_name": "first_name",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "First Name"
      },
      {
         "@property_name": "last_name",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "Last Name"
      },
      {
         "@property_name": "email",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "Email Address"
      },
      {
         "@property_name": "city",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "Current City"
      },
      {
         "@property_name": "country",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "Current Country"
      },
      {
         "@property_name": "employer",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "Employer Name"
      }
   ]
}

var location_type = {
   "@reference": "Location Game Checkin",
   "@context": [
      {
         "@property_name": "label",
         "@data_type": "string",
         "@multiple": false,
         "@required": true,
         "@context": "Checking Point Label"
      },
      {
         "@property_name": "lat",
         "@data_type": "float",
         "@multiple": false,
         "@required": true,
         "@context": "Latitude"
      },
      {
         "@property_name": "long",
         "@data_type": "float",
         "@multiple": false,
         "@required": true,
         "@context": "Longitude"
      }
   ]
}




var create_location_obj = function(loc, token){

   var location_obj = {
      "@type" : location_type_id,
      "@data"       : {
         "label" : loc.label,
         "lat"   : loc.lat,
         "long"  : loc.long
      }
   }

   it('Should persist Location Object ' + loc["label"], function () {
      this.timeout(10000);
      return request.post('/api/v1/objects')
         .send(location_obj)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         .expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            assert(body["@id"] !== undefined, "Object ID Should be returned");
         })

   })
}


var create_user_auth_and_create_objs = function(p, user, i){

   var token

   it('should create the user ' + p["email"], function () {
      this.timeout(10000);
      return request.post('/api/v1/auth/users')
         .send(user)
         .set('Accept', 'application/json')
         .expect('content-type', 'application/json; charset=utf-8')
   });

   it('should authorize ' + p["email"], function () {
      this.timeout(10000);

      return request.post('/api/v1/auth/authorizations')
         .send({
            "username": user.username,
            "password": user.password,
            api_key   : api_key,
            secret    : secret
         })
         .set('Accept', 'application/json')
         //.expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            assert(body["session"] !== undefined, 'Authorization session should be returned');
            token = body["session"];
         });
   });

   //var path = "/api/v1/app_permissions_latest/" + req.query.api_key;

   var setPermissions = function(per){

      for (var i = 0; i < per.permissions.length; i++){
         var perm = per.permissions[i]

         if ('service_enabler' === perm.type){

            for (var j =0; j < per.service_enablers.length; j++){
               var se = per.service_enablers[j]

               if (se.name === perm.ref){
                  per.permissions[i].cloudlet = se.cloudlet
               }
            }
         }
      }

      permissions = per.permissions
   }


   it('Should get latest app permissions ' + api_key, function () {
      return inter_request.get("/api/v1/app_permissions_latest/" + api_key)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         //.expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            setPermissions(body.result[0])
         })
   })


   //return

   it('Should persist user permissions ' + p["email"], function () {

      return inter_request.post('/api/v1/permissions/' + api_key)
         .send(permissions)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         //.expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);

            if (body instanceof Array){
               for (var k=0; k < body.length; k++){
                  assert(body[k]["status"] === 'update', 'Permission status should be {"status":"update"} but was:\n\t' + JSON.stringify(body[k]))
               }
            }
            else {
               assert(body["status"] === 'update', 'Permission status should be {"status":"update"} but was:\n\t' + JSON.stringify(body))
            }
         })
   })


   it('Should persist profile Object ' + p["email"], function () {

      var prof = {
         "@type" : profile_type_id,
         "@data"       : {
            "first_name" : p.first_name,
            "last_name"  : p.last_name,
            "email"      : p.email,
            "city"       : p.city,
            "country"    : p.country,
            "employer"   : p.employer
         }
      }

      this.timeout(10000);
      return request.post('/api/v1/objects')
         .send(prof)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         .expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            //console.log(body)
            assert(body["@id"] !== undefined, "Object ID Should be returned");

         })
   })


      for (var j = 10*i; j < 10*i + 10; j++) {

         var loc = location[j]

         if (undefined === loc){
            continue
         }

         var location_obj = {
            "@type": location_type_id,
            "@data"      : {
               "label": loc.label,
               "lat"  : loc.lat,
               "long" : loc.long
            }
         }

         it('Should persist Location Object ' + loc["label"], function (obj) {
            return function () {
               this.timeout(10000);
               return request.post('/api/v1/objects')
                  .send(obj)
                  .set('Accept', 'application/json')
                  .set('Authorization', token)
                  .expect('content-type', 'application/json; charset=utf-8')
                  .expect(function (response) {
                     var body = JSON.parse(response.text);
                     assert(body["@id"] !== undefined, "Object ID Should be returned");
                  })
            }

         }(location_obj))
      }

}


describe('Create Profiles', function () {
   //for (var i = 0; i < 1; i++) {
   for (var i = 0; i < profiles.length; i++) {
      var p      = profiles[i]
      var user   = {username:p["email"], password:p["email"]}

      create_user_auth_and_create_objs(p, user, i)
   }
})
