<?php

namespace app\widgets\CryptoPro;

use yii\bootstrap5\BootstrapAsset;
use yii\web\{AssetBundle, YiiAsset};

class CryptoProAsset extends AssetBundle
{
    public $sourcePath = __DIR__ . '/assets';
    public $css = [];
    public $js = [
        'js/cadesplugin_api.js',
        'js/sign-modal.js',
    ];

    public $depends = [
        YiiAsset::class,
        BootstrapAsset::class,
    ];
}
