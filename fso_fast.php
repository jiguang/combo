<?php

function http_post($url,$param){
    $oCurl = curl_init();
    if(stripos($url,"https://")!==FALSE){
        curl_setopt($oCurl, CURLOPT_SSL_VERIFYPEER, FALSE);
        curl_setopt($oCurl, CURLOPT_SSL_VERIFYHOST, false);
    }
    if (is_string($param)) {
        $strPOST = $param;
    } else {
		$strPOST = http_build_query($param);
    }
    curl_setopt($oCurl, CURLOPT_URL, $url);
    curl_setopt($oCurl, CURLOPT_RETURNTRANSFER, 1 );
    curl_setopt($oCurl, CURLOPT_POST,true);
    curl_setopt($oCurl, CURLOPT_POSTFIELDS,$strPOST);
    $sContent = curl_exec($oCurl);
    $aStatus = curl_getinfo($oCurl);
    curl_close($oCurl);
    if(intval($aStatus["http_code"])==200){
        return $sContent;
    }else{
        return false;
    }
}

// 太美 2014-11-20
$filename = $_POST['filename'];
$env = $_POST['env'];
$filelist = explode('|', $filename);
for($i=0; $i<count($filelist); $i++){
    $filelist[$i] = '/usr/local/project/htdocs/'.$filelist[$i];
}
//$filename = join('|', $filelist);
$url = 'http://10.133.145.102:8081/index.php/publish?id=0&from=dev&to='.$env;
$param = array(
	'title'=>'combo',
    'files' => $filelist,
);

echo http_post($url, $param);



