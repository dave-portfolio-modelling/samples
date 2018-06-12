using Amazon;
using Amazon.CognitoIdentityProvider;
using Amazon.Extensions.CognitoAuthentication;
using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Sample
{
    class Program
    {
        static int Main(string[] args)
        {
            // Sample.exe <input json filename>
            if (args.Length != 1)
            {
                Console.Error.WriteLine("USAGE: Sample.exe <input json filename>");
                return 1;
            }

            // I'm reading the username and password from console input to prevent developers from hardcoding it (It's senstive and can cost you credits if stolen)
            var input = args[0];
            Console.Write("Please type your email: ");
            var uid = Console.ReadLine();
            Console.Write("Password: ");
            var pwd = Console.ReadLine();

            try
            {
                LoginAndProcess(uid, pwd, File.ReadAllText(input)).Wait();
            }
            catch(Exception ex)
            {
                Console.Error.WriteLine(ex.ToString());
                return 1;
            }

            return 0;
        }

        private static async Task<string> GetIdToken(string uid, string pwd)
        {
            Console.WriteLine("Logging in using {0}...", uid);
            var provider = new AmazonCognitoIdentityProviderClient(new Amazon.Runtime.AnonymousAWSCredentials(), RegionEndpoint.EUWest2);
            var userPool = new CognitoUserPool("eu-west-2_iaOcSeO8H", "60b6uqu956ii0fjmno24ev4rh6", provider);
            var user = new CognitoUser(uid, "60b6uqu956ii0fjmno24ev4rh6", userPool, provider);
            InitiateSrpAuthRequest authRequest = new InitiateSrpAuthRequest()
            {
                Password = pwd
            };

            AuthFlowResponse authResponse = await user.StartWithSrpAuthAsync(authRequest).ConfigureAwait(false);
            return authResponse.AuthenticationResult.IdToken;
        }

        private static async Task LoginAndProcess(string uid, string pwd, string content)
        {
            // Get the jwt token
            var accessToken = await GetIdToken(uid, pwd);

            Console.WriteLine("Calling Modeller...");
            // Now call the service
            var sc = new StringContent(content, Encoding.UTF8, "application/json");

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                var rsp = await client.PostAsync("https://api.portfolio-modelling.com/v1/balance", sc);
                rsp.EnsureSuccessStatusCode();
                Console.WriteLine(await rsp.Content.ReadAsStringAsync());
            }
        }
    }
}
