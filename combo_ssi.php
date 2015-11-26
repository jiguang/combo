<?php

/**
 * @name combo
 * @desc combo 时间戳工具，接收combo后地址，直接生成文件名为随机数字的时间戳
 */

//获取页面片内容
if(isset($_GET["ssiFileName"])){
    $ssiFileName="/usr/local/project/htdocs/static".$_GET["ssiFileName"];
    if(file_exists($ssiFileName)){
        echo file_get_contents($ssiFileName);
    }
    exit;
}

$SVRPATH = "/usr/local/project/htdocs/static"; // 静态文件目录
$DIRPATH = $SVRPATH."/sinclude/cssi/"; //页面片目录
$CSSPATH = $SVRPATH; //样式文件目录
$FILELIST; //关联的样式列表
$FIND; //关联样式名称



if(isset($_POST["edit"])){
    $fileName = isset($_POST['fileName']) ? $_POST['fileName']:"";
    $comboStr = isset($_POST['comboStr']) ? $_POST['comboStr'] : "";
    $devPath= isset($_POST['devPath']) ? $_POST['devPath'] : "pc";

    if($devPath!="") $DIRPATH.=$devPath."/";
    if(strpos($comboStr, '?t') > 0){
        $comboStr = preg_replace('/\?t=.*/g', '?t='.mktime(), $comboStr);
        $content='<link combofile="'.$fileName.'" rel="stylesheet" href="'.$comboStr.'" />';
    }else{
        $content='<link combofile="'.$fileName.'" rel="stylesheet" href="'.$comboStr."?t=".mktime().'" />';
    }

    if(file_put_contents($DIRPATH.$fileName,$content)>0){
        echo '{"status":1,"url":"'.$fileName.'"}';
    }
    else{
        echo '{"status":0,"url":"file content is null."}';
    }
    return;
}

//生成或更新页面片
if(isset($_POST['fileName']))
{
    $fileName = isset($_POST['fileName']) ? $_POST['fileName'] : mktime().'.shtml';
    $comboStr = isset($_POST['comboStr']) ? $_POST['comboStr'] : "";
    $updateList = isset($_POST['updateList']) ? $_POST['updateList'] : "";
    $updateAll = isset($_POST['updateAll']) ? $_POST['updateAll'] : "";

    $devPath= isset($_POST['devPath']) ? $_POST['devPath'] : "pc";

    //当前目录 网购 or 拍拍
    if($devPath!="") $DIRPATH.=$devPath."/";
    else return;

    if(file_exists($DIRPATH.$fileName))  //文件存在，更新页面片和压缩样式
    {

        $FILELIST=array();

        if($updateList<>"") createMinCss($updateList);

        if($updateAll=="1" && $updateList!=""){

            //更新关联页面片
            $checklist=explode(",",$updateList);
            $FIND=$checklist[0];

            listDir($DIRPATH);
        }
        else{

            //更新当前页面片
            array_push($FILELIST,str_replace($SVRPATH,"",$DIRPATH).$fileName);
            updateIncFile($fileName);
        }
        echo '{"status":1,"url":"'.implode(",",$FILELIST).'"}';
    }
    else //文件不存在，创建页面片和压缩样式
    {

        $updateList=covertNorPath($comboStr);
        if($updateList<>"") createMinCss($updateList);
        createIncFile($fileName,$comboStr);
    }
}

//生成页面片
function createIncFile($newfileName,$content){
    global $DIRPATH;
    global $SVRPATH;

    $content.="?t=".mktime(); //创建时添加时间戳

    $content='<link combofile="'.$newfileName.'" rel="stylesheet" href="'.$content.'" />';

    $dir=preg_replace('/\w*.s?html/', "", $newfileName);

    if(file_exists($DIRPATH.$dir))
    {
        file_put_contents($DIRPATH.$newfileName, $content);
        echo '{"status":1,"url":"'.str_replace($SVRPATH,"",$DIRPATH).$newfileName.'"}';
    }
    else echo '{"status":0,"url":"'.$dir.',file is not exists!"}';
}

//更新页面片
function updateIncFile($updatefilename){
    global $DIRPATH;

    $content=file_get_contents($DIRPATH.$updatefilename);
    $content=preg_replace('/\?t=\d+/', "?t=".mktime(), $content);
    $content=preg_replace('/http:/', '', $content);

    file_put_contents($DIRPATH.$updatefilename, $content);
}

//生成MIN文件
function createMinCss($updateList){

    global $CSSPATH;

    $css_list=explode(",",$updateList);

    foreach($css_list as $css){

        $min_path=$CSSPATH.$css;
        $nor_path=str_replace(".min.css",".css",$min_path);

        if(file_exists($nor_path)){  //压缩文件判断是否存在
            if(importCSS($nor_path,$min_path)) compressCSS($min_path,$min_path);  //有文件合并，则从合并后的文件压缩
            else compressCSS($nor_path,$min_path);  //若无文件合并，则从原文件压缩
        }
        else if(file_exists($min_path)){ //针对SASS文件压缩，从 s.min.css 压缩。
            compressCSS($min_path,$min_path);  //则从合并后的文件压缩
        }
        else{
            echo '{"status":0,"url":"'.str_replace($CSSPATH,"",$nor_path).',file is not exists!"}';
            exit;
        }
    }
}

//压缩样式 暂时不用php压缩 2014-11-27 laser
function compressCSS($css_path, $css_min_path){
/*    require_once('class.cssmin.php');
    $css_codes = file_get_contents($css_path);
    $css_content = CssMin::minify($css_codes, array('compress-unit-values' => true ));
    file_put_contents($css_min_path, $css_content);*/
}

//分割地址
function covertNorPath($s){
    $s=substr($s,strpos($s,"??")+2);
    $s=substr($s,0,strpos($s,"?t="));
    return $s;
}

//遍历目录更新
function listDir($dir)
{
    global $FIND;
    global $DIRPATH;
    global $SVRPATH;
    global $FILELIST;

    if(is_dir($dir))
    {
        if ($dh = opendir($dir))
        {
            while (($file = readdir($dh)) !== false)
            {
                if((is_dir($dir."/".$file)) && $file!="." && $file!="..")
                {
                    listDir($dir.$file."/");
                }
                else
                {
                    if($file!="." && $file!=".." && $file!=".DS_Store")
                    {

                        $cont=file_get_contents($dir.$file);

                        if(strpos($cont,$FIND)){

                            $cur=str_replace($DIRPATH,"",$dir).$file;

                            array_push($FILELIST,str_replace($SVRPATH,"",$DIRPATH).$cur);

                            updateIncFile($cur);

                        }
                    }
                }
            }
            closedir($dh);
        }
    }
}

//合并import
function importCSS($file,$minfile)
{
    $cont=file_get_contents($file);
    $reg = '/@import\s+url\([\'\"]?(.*?)[\'\"]?\)/i';
    preg_match_all($reg, $cont, $match);

    $implist=$match[0];
    $csslist=$match[1];
    if(count($implist)>0){
        $index=0;
        $dir=dirname($file)."/";

        foreach ($csslist as $css)
        {

            if(isOutlink($css)){
                $absp=absPath($dir,$css);
                if(file_exists($absp)){
                    $ct=file_get_contents($absp);
                    $cont=str_replace($implist[$index].';',$ct, $cont);
                }
            }
            $index++;
        }
        file_put_contents($minfile, $cont);
        return 1;
    }
    else return 0;
}

function isOutlink($css){ //返回0代表是外部地址，1代表相对地址
    $link=array("http",".com",".cn","st.midea.com","static.midea.com");
    foreach($link as $one){
        if(stripos($css,$one)) return 0;
    }
    return 1;
}
function absPath($dir,$css){ //绝对路径转换
    global $CSSPATH;
    if(substr($css,0,1)=="/") return $CSSPATH.$css;
    else return $dir.$css;
}
