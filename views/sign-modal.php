<?php

use yii\bootstrap5\{ActiveForm, Modal};
use yii\base\Model;
use yii\helpers\Html;
use yii\web\View;

/* @var $this View */
/* @var $model Model */
/* @var $attribute string */
/* @var $modalOptions array Параметры модального окна */
/* @var $signBtn array Параметры кнопки подписать */
/* @var $modalSubmitBtn array Параметры кнопки отправки в модальном окне */
/* @var $signAction string ActiveForm action */
/* @var $formId string ActiveForm id */

?>
<?= Html::a($signBtn['text'], '', $signBtn['options']) ?>

<?php Modal::begin($modalOptions); ?>
<div class="row px-3">
    <label class="mb-1">Выберите ключ для подписи</label>
    <?= Html::dropDownList('crypto-pro-cert-list', null, [], [
        'id' => 'certs',
        'options' => [
            'multiple' => 'multiple',
        ],
        'class' => 'p-1',
        'size' => 3
    ]) ?>
</div>
<div>
    <?php $form = ActiveForm::begin([
        'id' => $formId,
        'action' => $signAction
    ]) ?>
    <?= $form->field($model, $attribute)->hiddenInput()->label(false) ?>
    <?= Html::submitButton($modalSubmitBtn['text'], $modalSubmitBtn['options']) ?>
    <?php ActiveForm::end() ?>
</div>
<?php Modal::end(); ?>
