# Lord Laser

Crowd sourced good trouble.

## Getting Started

1. In order to build this on your own you will need to fork this repo and customize lordlaser-constants.ts - the comments in that file should be fairly self explanatory
1. This is designed to work with a custom domain name. You can use the built in APIGateway domain with some tweaking but the easy approach is just to get yourself a domain then pick an endpoint for this project (e.g. lordlaser.example.com)
1. You'll need to generate a ACM certificate for the endpoint you specify in the previous step. If you use Route53 to host your DNS cert validation is pretty easy
1. Once you deploy the stack you need to manually allocate SMS phone numbers and setup two-way communication to the inbound SMS topic
1. You'll then need to add some users to the created Cognito User Pool to login to the web interface (the generated RSS feed doesn't require authentication)
