<?php

/* 获取 CSS 文件中的图片地址 by laser 201511-26 */

$file = $_POST['file'];
if(!$file){
    echo json_encode(array(
        'errcode' => 1,
        'errmsg' => '参数错误',
        'data' => array()
    ));
}else{
    $content = file_get_contents('http://st.midea.com'.$file);

    $imgReg = '/(url\("?)(.*?(jpg|png|gif))/';
    preg_match_all($imgReg, $content, $matches);

    $ret = array();
    if(isset($matches[2])){
        foreach($matches[2] as $item){
            $item = preg_replace('/.*?st\.midea\.com/', '', $item);
            array_push($ret, $item);
        }
    }
    echo json_encode(array(
        'errcode' => 0,
        'errmsg' => '',
        'data' => $ret
    ));
}
