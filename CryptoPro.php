<?php

namespace app\widgets\CryptoPro;

use yii\base\{DynamicModel, InvalidConfigException, Model, Widget};
use yii\helpers\Html;
use yii\web\JsExpression;
use function key_exists;

class CryptoPro extends Widget
{

    /**
     * ID модального окна по умолчанию
     */
    const string DEFAULT_MODAL_ID = 'crypto-pro-modal';

    /**
     * Атрибут модели для сохранения подписи по умолчанию
     */
    const string DEFAULT_MODEL_ATTR = 'signature';

    /**
     * Ссылка на файл для скачивания
     * @var string
     */
    public string $fileUrl = '';

    /**
     * Контент файла в base64
     * @var string
     */
    public string $base64content = '';

    /**
     * url на action который принимает подпись
     * @var string
     */
    public string $signAction = '';

    /**
     * ID формы отправки
     * @var string
     */
    public string $formId = 'crypto-pro-form';

    /**
     * Модель для формы
     * @var Model|null
     */
    public ?Model $model = null;

    /**
     * Атрибут модели для подписи
     * @var string
     */
    public string $attribute = '';

    /**
     * Откреплённая подпись
     * @var bool
     */
    public bool $detachedSign = false;

    /**
     * Подписать хеш
     * @var bool
     */
    public bool $signHash = false;

    /**
     * Параметры кнопки для начала процесса подписания Html::a($text, $options)
     * @var array['text' => string, 'options' => []]
     */
    public array $signBtn = [
        'text' => 'Подписать',
        'options' => [
            'id' => 'crypto-pro-sign-btn',
            'data' => [
                'bs-target' => '#' . self::DEFAULT_MODAL_ID,
                'bs-toggle' => 'modal',
            ],
        ],
    ];

    /**
     * options модального окна для выбора ключа подписания
     * @var array
     */
    public array $modalOptions = [
        'id' => self::DEFAULT_MODAL_ID,
        'title' => 'Подписать',
    ];


    /**
     * Кнопка для подписания в модальном окне Html::submitButton($text, $options)
     * @var array ['text' => string, 'options' => []]
     */
    public array $modalSubmitBtn = [
        'text' => 'Подписать КЭП',
        'options' => [
            'id' => 'cadescom-btn',
        ],
    ];

    /**
     * Инициализация из атрибутов
     * @return void
     * @throws InvalidConfigException
     */
    public function init(): void
    {
        if ($this->model === null) {
            $this->model = new DynamicModel([self::DEFAULT_MODEL_ATTR]);
            $this->model->addRule(self::DEFAULT_MODEL_ATTR, 'required');
            $this->model->addRule(self::DEFAULT_MODEL_ATTR, 'string');
            $this->attribute = self::DEFAULT_MODEL_ATTR;
        } elseif (!$this->attribute) {
            throw new InvalidConfigException('Необходимо указать наименование атрибута(attribute) для отправки с формы!');
        }
        if (!$this->fileUrl && !$this->base64content) {
            throw new InvalidConfigException('Необходимо указать адрес(fileUrl) для загрузки файла или контент в base64(base64content)!');
        }
        if (!$this->signAction) {
            throw new InvalidConfigException('Необходимо указать адрес(signAction) получатель подписи!');
        }
        $this->fixBsAttributes();
        parent::init();
        $this->addInitJsEvent();
    }

    /**
     * Заполнение обязательных атрибутов, если они не указаны
     * @return void
     */
    protected function fixBsAttributes(): void
    {
        $this->signBtn['options']['data']['bs-target'] = '#' . $this->modalOptions['id'];
        $this->signBtn['options']['data']['bs-toggle'] = 'modal';

        if (key_exists('id', $this->modalOptions) || !$this->modalOptions['id']) {
            $this->modalOptions['id'] = self::DEFAULT_MODAL_ID;
        }
    }

    /**
     * @inheritdoc
     * @return string
     */
    public function run(): string
    {
        $view = $this->getView();
        $view->registerJs($this->createJs(), $view::POS_END);
        CryptoProAsset::register($view);
        return $this->render('sign-modal', [
            'model' => $this->model,
            'attribute' => $this->attribute,
            'modalOptions' => $this->modalOptions,
            'signBtn' => $this->signBtn,
            'modalSubmitBtn' => $this->modalSubmitBtn,
            'signAction' => $this->signAction,
            'formId' => $this->formId,
        ]);
    }

    /**
     * Прикрепление скрипта инициализации JS к модальному окну
     * @return void
     */
    public function addInitJsEvent(): void
    {
        $js = new JsExpression("(event) => init()");

        if (key_exists('clientEvents', $this->modalOptions) && key_exists('shown.bs.modal', $this->modalOptions['clientEvents'])) {
            $this->modalOptions['clientEvents']['shown.bs.modal'] .= $js;
        } else {
            $this->modalOptions['clientEvents'] = [
                'shown.bs.modal' => $js
            ];
        }
    }

    /**
     * Генерация JS в соответствии с заданными параметрами
     * @return JsExpression
     */
    protected function createJs(): JsExpression
    {
        $signatureFieldId = Html::getInputId($this->model, $this->attribute);

        $detachedSignStr = $this->detachedSign ? 'true' : 'false';
        $signFunction = $this->signHash ? 'signHash' : 'sign';

        if ($this->base64content) {
            $signContent = "$signFunction('$this->base64content');";
        } elseif ($this->fileUrl) {
            $signContent = "loadDocument('$this->fileUrl');";
        } else {
            $signContent = "alert('Отсутствует контент для подписания!'); return;";
        }

        return new JsExpression(<<<JS
const detachedSign = {$detachedSignStr};

function addButtonEvent() {
    const cadescomButton = document.getElementById("{$this->modalSubmitBtn['options']['id']}");
    if (cadescomButton) {
        cadescomButton.addEventListener("click", (event) => {
          event.preventDefault();
          $signContent
        });
    }
}

function fillSignature(sSignedMessage) {
  console.log();
  const signTextarea = document.getElementById("$signatureFieldId");
  if (signTextarea) {
    signTextarea.value = sSignedMessage;
    const form = document.getElementById("$this->formId");
    if(form) {
      form.submit();
    }
  }
}

function loadDocument(url) {
  const reader = new FileReader();
  reader.onload = function (oFREvent) {
    const header = ";base64,";
    const sFileData = oFREvent.target.result;
    const sBase64Data = sFileData.substring(sFileData.indexOf(header) + header.length);
    {$signFunction}(sBase64Data);
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
JS
        );
    }
}
