import axios from "axios";

export default class Authenticator {
  public clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  private async GetDeviceCode() {
    return await axios.post(
      "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode",
      {
        client_id: this.clientId,
        scope: "XboxLive.signin",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
  }

  private async MSAuthPoll(_device_code: string) {
    return await axios.post(
      "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
      {
        client_id: this.clientId,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: _device_code,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
  }

  private async XboxLiveAuth(_ms_token: string) {
    return await axios.post(
      "https://user.auth.xboxlive.com/user/authenticate",
      {
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${_ms_token}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
  }

  private async GetXSTSToken(_xbl_token: string) {
    return await axios.post(
      "https://xsts.auth.xboxlive.com/xsts/authorize",
      {
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [_xbl_token],
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
  }

  private async GetMinecraftToken(_user_hash: string, _xsts_token: string) {
    return await axios.post(
      "https://api.minecraftservices.com/authentication/login_with_xbox",
      {
        identityToken: `XBL3.0 x=${_user_hash};${_xsts_token}`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${_xsts_token}`,
        },
      }
    );
  }

  private async GetMinecraftProfile(_xsts_token) {
    return await axios.get(
      "https://api.minecraftservices.com/minecraft/profile",
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${_xsts_token}`,
        },
      }
    );
  }

  public async Authenticate() {
    const DeviceCodeData = (await this.GetDeviceCode()).data;

    console.log(DeviceCodeData.message);

    // poll for MS auth token.
    let MSAuthData;
    while (true) {
      try {
        MSAuthData = (await this.MSAuthPoll(DeviceCodeData.device_code)).data;
        break;
      } catch (e) {
        if (e.response.status != 400) {
          throw e;
        }
      }
    }

    const XBLAuthData = (await this.XboxLiveAuth(MSAuthData.access_token)).data;
    const XSTSData = (await this.GetXSTSToken(XBLAuthData.Token)).data;
    const MinecraftData = (
      await this.GetMinecraftToken(
        XSTSData.DisplayClaims.xui[0].uhs,
        XSTSData.Token
      )
    ).data;
    const MinecraftProfile = (
      await this.GetMinecraftProfile(MinecraftData.access_token)
    ).data;

    return {
      MinecraftProfile,
      MinecraftToken: MinecraftData.access_token,
      XBLToken: XBLAuthData.Token,
      XSTSToken: XSTSData.Token,
      mlc: {
        uuid: MinecraftProfile.id,
        name: MinecraftProfile.name,
        access_token: MinecraftData.access_token,
        user_properties: "{}",
        meta: {
          type: "msa",
          demo: false,
        },
      },
    };
  }
}

function ask(_question, _format, _callback) {
  var stdin = process.stdin,
    stdout = process.stdout;

  stdin.resume();
  stdout.write(_question + ": ");

  stdin.once("data", function (_data) {
    var data = _data.toString();
  });
}
