function init() {
  if (typeof cadesplugin === "undefined") {
    alert("Необходимо установить плагин для работы с КриптоПРО");
  }

  // Проверяем, работает ли File API
  if (!window.FileReader) {
    alert("Необходимо обновить браузер! Ваша версия браузера не поддерживает FileAPI.");
  }

  checkCryptoPro("Crypto-Pro GOST R 34.10-2012 Cryptographic Service Provider", 80);

  loadKeyList();
  addButtonEvent();
}


function loadDocument(url) {
  const reader = new FileReader();
  reader.onload = function (oFREvent) {
    const header = ";base64,";
    const sFileData = oFREvent.target.result;
    const sBase64Data = sFileData.substring(sFileData.indexOf(header) + header.length);
    sign(sBase64Data);
  };

  fetch(url)
    .then((response) => {
      if (response.status !== 200) {
        return;
      }
      response.blob().then(fileBlob => {
        reader.readAsDataURL(fileBlob);
      }).catch(
        (err) => {
          console.log("Не верный формат файла!", err);
        }
      );
    }).catch((err) => {
    console.log("Не удалось получить файл!", err);
  });
}

function loadKeyList() {
  let certSelect = document.getElementById("certs");
  if (certSelect) {
    cadesplugin.then(() => {
      cadesplugin.async_spawn(function* (args) {
        try {
          certSelect.options.length = 0;
          let oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
          yield oStore.Open(
            cadesplugin.CADESCOM_CONTAINER_STORE,
            cadesplugin.CAPICOM_MY_STORE,
            cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
          );

          let oCertificates = yield oStore.Certificates;
          let count = yield oCertificates.Count;
          for (let i = 1; i <= count; i++) {
            let cert = yield oCertificates.Item(i);
            let certObj = new CertificateObj(cert);
            let certString = yield certObj.GetCertString();
            let isValid = certObj.certTillDate > Date.now();
            if (isValid) {
              let text = CertStatusEmoji(isValid) + certString;
              let pKey = yield cert.PrivateKey;
              let value = yield pKey.UniqueContainerName;
              fillSelectOption(certSelect, text, value);
            }
          }
        } catch (err) {
          alert(cadesplugin.getLastError(err));
        }
      });
    });
  }
}

function sign(sBase64Data) {
  getOStore().then((oStore) => {
    getOCertificate(oStore).then((oCertificate) => {
      if (!oCertificate) {
        alert("Сертификат отсутствует в хранилище.");
      } else {
        createOSigner(oCertificate).then((oSigner) => {
            cadesplugin.async_spawn(function* (args) {
              const oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
              yield oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
              yield oSignedData.propset_Content(sBase64Data);

              let isSigned = false;
              try {
                yield oSignedData.VerifyCades(sBase64Data, cadesplugin.CADESCOM_CADES_BES);
                isSigned = true;
              } catch (e) {
              }

              let sSignedMessage;
              try {
                if (isSigned) {
                  sSignedMessage = yield oSignedData.CoSignCades(oSigner, cadesplugin.CADESCOM_CADES_BES);
                } else {
                  sSignedMessage = yield oSignedData.SignCades(oSigner, cadesplugin.CADESCOM_CADES_BES, detachedSign);
                }
              } catch (err) {
                alert("Не удалось создать подпись. Ошибка: " + cadesplugin.getLastError(err));
                return;
              }
              fillSignature(sSignedMessage);
            });
          }
        );
      }
    });
    cadesplugin.async_spawn(function* (args) {
      yield oStore.Close();
    });
  });
}

function signHash(sBase64Data) {
  getOStore().then((oStore) => {
    getOCertificate(oStore).then((oCertificate) => {
      if (!oCertificate) {
        alert("Сертификат отсутствует в хранилище.");
      } else {
        createOSigner(oCertificate).then((oSigner) => {
            cadesplugin.async_spawn(function* (args) {
              const oHashedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.HashedData");
              yield oHashedData.propset_Algorithm(cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_256);
              yield oHashedData.propset_DataEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
              yield oHashedData.Hash(sBase64Data);
              const oHashedValue = yield oHashedData.Value;
              console.log(oHashedValue);
              yield oHashedData.SetHashValue(oHashedValue);

              const oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");

              let sSignedMessage;
              try {
                sSignedMessage = yield oSignedData.SignHash(oHashedData, oSigner, cadesplugin.CADESCOM_CADES_BES);
              } catch (err) {
                alert("Не удалось создать подпись. Ошибка: " + cadesplugin.getLastError(err));
              }
              fillSignature(sSignedMessage);
            });
          }
        );
      }
    });
    cadesplugin.async_spawn(function* (args) {
      yield oStore.Close();
    });
  });
}

function getOStore() {
  return new Promise(function (resolve, reject) {
    cadesplugin.async_spawn(function* (args) {
      const oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");

      yield oStore.Open(
        cadesplugin.CAPICOM_CURRENT_USER_STORE,
        cadesplugin.CAPICOM_MY_STORE,
        cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
      );
      return args[0](oStore);
    }, resolve, reject);
  });
}

function getOCertificate(oStore) {
  return new Promise(function (resolve, reject) {
    cadesplugin.async_spawn(function* (args) {
      const oCertName = document.getElementById("certs");
      const sCertName = oCertName.value;
      if ("" == sCertName) {
        alert("Необходимо выбрать подпись.");
        return;
      }

      const oCertificates = yield oStore.Certificates;
      const count = yield oCertificates.Count;
      for (let i = 1; i <= count; i++) {
        let cert = yield oCertificates.Item(i);
        let pKey = yield cert.PrivateKey;
        let value = yield pKey.UniqueContainerName;
        if (sCertName === value) {
          return args[0](cert);
        }
      }
      return args[0](null);
    }, resolve, reject);
  });
}

function createOSigner(oCertificate) {
  return new Promise(function (resolve, reject) {
    cadesplugin.async_spawn(function* (args) {
      const oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
      yield oSigningTimeAttr.propset_Name(cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
      yield oSigningTimeAttr.propset_Value(new Date());


      const oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
      yield oDocumentNameAttr.propset_Name(cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
      yield oDocumentNameAttr.propset_Value("pdf_for_sign.pdf");

      const oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
      yield oSigner.propset_Certificate(oCertificate);
      yield oSigner.propset_CheckCertificate(true);
      const oAuthAttrs = yield oSigner.AuthenticatedAttributes2;
      yield oAuthAttrs.Add(oSigningTimeAttr);
      yield oAuthAttrs.Add(oDocumentNameAttr);

      return args[0](oSigner);
    }, resolve, reject);
  });
}


function checkCryptoPro(ProviderName, ProviderType) {
  cadesplugin.async_spawn(function* (args) {
    try {
      let oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
      oVersion = yield oAbout.CSPVersion(ProviderName, parseInt(ProviderType, 10));
      /*
            let Minor = yield oVersion.MinorVersion;
            let Major = yield oVersion.MajorVersion;
            let Build = yield oVersion.BuildVersion;
            let Version = yield oVersion.toString();
       */
    } catch (er) {
      err = cadesplugin.getLastError(er);
      if (err.indexOf("0x80090019") + 1)
        return "Указанный CSP не установлен";
      else
        return err;
    }
  });
}

function CertStatusEmoji(isValid) {
  return isValid ? "\u2705" : "\u274C";
}

function fillSelectOption(select, text, value) {
  let opt = document.createElement("OPTION");
  opt.text = text;
  opt.value = value;
  select.add(opt);
}

class CertificateObj {
  constructor(certObj) {
    this.cert = certObj;

    this.cert.ValidFromDate.then((value) => {
      this.certFromDate = new Date(value);
    });

    this.cert.ValidToDate.then((value) => {
      this.certTillDate = new Date(value);
    });
  }

  check(digit) {
    return (digit < 10) ? "0" + digit : digit;
  }

  checkQuotes(str) {
    let result = 0, i = 0;
    for (i; i < str.length; i++) {
      if (str[i] === '"') {
        result++;
      }
    }
    return !(result % 2);
  }

  extract(from, what) {
    let certName = "";

    let begin = from.indexOf(what);

    if (begin >= 0) {
      let end = from.indexOf(", ", begin);
      while (end > 0) {
        if (this.checkQuotes(from.substr(begin, end - begin))) {
          break;
        }
        end = from.indexOf(", ", end + 1);
      }
      certName = (end < 0) ? from.substr(begin) : from.substr(begin, end - begin);
    }
    return certName;
  }

  DateTimePutTogether(certDate) {
    return this.check(certDate.getUTCDate()) + "." + this.check(certDate.getUTCMonth() + 1) + "." + certDate.getFullYear() + " " +
      this.check(certDate.getUTCHours()) + ":" + this.check(certDate.getUTCMinutes()) + ":" + this.check(certDate.getUTCSeconds());
  }

  async GetCertString() {
    return this.extract(await this.cert.SubjectName, "CN=") + "; Выдан:" + this.GetCertFromDate() + " До:" + this.GetCertTillDate();
  }

  GetCertFromDate() {
    return this.DateTimePutTogether(this.certFromDate);
  }

  GetCertTillDate() {
    return this.DateTimePutTogether(this.certTillDate);
  }

  async GetPubKeyAlgorithm() {
    const pubKey = await this.cert.PublicKey();
    const algorithm = await pubKey.Algorithm;
    return await algorithm.FriendlyName;
  }

  async GetCertName() {
    return this.extract(await this.cert.SubjectName, "CN=");
  }

  async GetIssuer() {
    return this.extract(await this.cert.IssuerName, "CN=");
  }

  async GetPrivateKeyProviderName() {
    const privateKey = await this.cert.PrivateKey;
    return await privateKey.ProviderName;
  }

  async GetPrivateKeyLink() {
    const privateKey = await this.cert.PrivateKey;
    return await privateKey.UniqueContainerName;
  }

}





