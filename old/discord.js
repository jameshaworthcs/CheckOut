app.get('/auth/discord',async(req,res)=>{
    const code=req.query.code;
    const params = new URLSearchParams();
    let user;
    params.append('client_id', "");
    params.append('client_secret', "");
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', "https://.com/auth/discord");
    try{
        const response=await axios.post('https://discord.com/api/oauth2/token',params)
        const { access_token,token_type}=response.data;
        const userDataResponse=await axios.get('https://discord.com/api/users/@me',{
            headers:{
                authorization: `${token_type} ${access_token}`
            }
        })
        console.log('Data: ',userDataResponse.data)
        req.session.user = {
          id: userDataResponse.data.id,
          username: userDataResponse.data.username,
          global_name: userDataResponse.data.global_name
        };
        // Example: Check if the user has a role named 'Admin' in any of the guilds
      //   const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
      //     headers: {
      //       Authorization: `${token_type} ${access_token}`,
      //     },
      //   });
  
      //   const adminRoleName = 'Admin';
      //   const hasAdminRole = await Promise.all(guildsResponse.data.map(async (guild) => {
      //     return hasRole(req.session.user.id, guild.id, adminRoleName, access_token);
      //   }));
  
      // // 'hasAdminRole' is an array indicating whether the user has the 'Admin' role in each guild
      // console.log('User has Admin role in any guild:', hasAdminRole.includes(true));
  
        // return res.send(`
        //     <div style="margin: 300px auto;
        //     max-width: 400px;
        //     display: flex;
        //     flex-direction: column;
        //     align-items: center;
        //     font-family: sans-serif;"
        //     >
        //         <h3>Welcome ${req.session.user.username}</h3>
        //     </div>
        // `)
        return res.redirect("/")
        
    }catch(error){
        console.log('Error',error)
        return res.send('Some error occurred!')
    }
  })

  // Function to check if the user has a certain role in any of the guilds
async function hasRole(userId, guildId, roleName, accessToken) {
    try {
      const response = await axios.get(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      const member = response.data;
      console.log(member)
      const role = member.roles.find((roleId) => roleId === roleName);
  
      return !!role;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }