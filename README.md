# crypto-pro-yii2

Подписание документов с помощью КриптоПро ЭЦП Browser plug-in

Генерирует на странице кнопку и модальное окно для выбора ключа и подписания документа.

### Параметры

`fileUrl` - Ссылка на файл для скачивания \
`base64content` - Контент файла в base64 \
`signAction` - url на action который принимает подпись \
`formId` - ID формы отправки \
`model` - Модель для формы \
`attribute` - Атрибут модели для подписи \
`detachedSign` - Откреплённая подпись \
`signHash` - Подписать хеш \
`signBtn` - Параметры кнопки для начала процесса подписания ['text' => string, 'options' => array()] для Html::a($text, $options) \
`modalSubmitBtn` - Кнопка для подписания в модальном окне ['text' => string, 'options' => array()] для Html::submitButton($text, $options) \
`modalOptions` - options модального окна для выбора ключа подписания

### Пример использования

```
CryptoPro::widget([
    'model' => $model,
    'attribute' => 'base64sign',
    'fileUrl' => Url::toRoute(['file', 'id' => $model->id]),
    'detachedSign' => true,
    'signHash' => true,
    'signAction' => Url::toRoute(['sign', 'id' => $model->id]),
    'signBtn' => [
        'text' => 'Открыть модальное окно',
        'options' => [
            'id' => 'crypto-pro-sign-btn',
            'data' => [
                'bs-target' => "#crypto-pro-modal",
                'bs-toggle' => 'modal',
            ],
        ],
    ],
    'modalOptions' => [
        'id' => 'crypto-pro-modal',
        'title' => 'Модальное окно для выбора ключа',
        'size' => Modal::SIZE_LARGE,
        'scrollable' => false,
        'options' => [
            'data' => false,
        ],
    ],
    'modalSubmitBtn' => [
        'text' => 'Подписать и отправить форму',
        'options' => [
            'id' => 'cadescom-btn',
        ]
    ],
]);
```

# КриптоПРО
Офф. сайт - https://cryptopro.ru/

Страница для проверки сгенерированных подписей - https://cryptopro.ru/sites/default/files/products/cades/demopage/main.html

Инструкция для работы с плагином https://docs.cryptopro.ru/cades/plugin/plugin-samples
